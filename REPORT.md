Hi Nitin,

First off, thanks for giving me this assignment; I've really enjoyed the process of breaking apart this problem and finding a solution. It was fascinating to dig into web workers, the guts of React, and React app performance. Below you'll see what I found.

Thanks,

Andrew

Let me start with a TL;DR:

- Using the `react-worker-dom` library, you **can** do React's virtual DOM reconciliation in a web worker.
- However, given the experimental nature of the library, it might be a bad idea to use it in production.
- When React's new reconciliation algorithm, Fiber, is released (probably later this year), it will be a much more stable and (likely) faster solution.
- One solution would be to use `react-worker-dom` until React Fiber is available.
- However, I think there are a few other performance solutions that should be considered first.

Now the long version...

# React and Web Workers

React doesn't support web workers by default. This kind of makes sense: React is a UI library, and web workers have no access to the DOM, events, layout data, etc. because they run in another global context, and therefore don't have access to `window`. However, since React implements its own "Virtual DOM", a lot of its code doesn't actually need any of that. Theoretically, then, it should be possible to run virtual DOM reconciliations in a web worker.

I found several discussions about this around the web, but only one real implementation of this: that is the `react-worker-dom` library that you pointed me to. This project was created by Microsoft developer Parashuram N, and is explained well in [his talk at React Rally 2016](https://www.youtube.com/watch?v=BJZx4twjt-I) and his two blog posts ([part 1](http://blog.nparashuram.com/2015/12/react-web-worker-renderer.html) and [part 2](http://blog.nparashuram.com/2016/02/using-webworkers-to-make-react-faster.html)). He calls it a custom renderer for React, but that's not quite right, because it doesn't replace React DOM. Instead, it "tricks" React DOM into thinking it is the element to render into. This would go in a web worker file:

    // file: worker.js
    import React from 'react';
    import ReactDOM from 'react-dom';
    import WorkerDOM from 'react-worker-dom/worker';
    import { App } from './components/App';

    ReactDOM.render(<App />, WorkerDOM);
    
(Note that, although this is how the library works, this isn't how [the documentation](https://www.npmjs.com/package/react-worker-dom) shows it; I've submitted [a pull request](https://github.com/web-perf/react-worker-dom/pull/19) that will correct the documentation.)

That `WorkerDOM` will then take the list of DOM manipulations from `ReactDOM` and send them to the UI Thread, which actually renders them to the element:

    // file: main.js
    import ReactDOM from 'react-worker-dom/page';
    const el = document.getElementById('main');

    ReactDOM.render(new Worker('worker.js'), el);

According to the documentation, "All the Virtual DOM reconciliations happen in a WebWorker thread. Only node updates are sent over to the UI thread", where the DOM manipulations take place. Parashuram has run extensive performance tests on this, and it is indeed faster than using React DOM.

I tested this library with a small application ([available on GitHub](https://github.com/andrew8088/react-web-worker-test)). There's both a "with-worker" page and a "without-worker" page. As you can see, I tried to make it somewhat similar RBC's e-trading application: I use web sockets to send data to the client, and then render that data in a table. I use a list of 250 objects, and push new data over the web socket connection every 50ms. Then, I have an input box which is a controlled component. On the "without-worker" page, you can clearly see the page blocking when you try to type quickly in the box. On the "with-worker" page, you can type quickly without a problem. It's a pretty amazing difference.

This was with React 15.3.0. When I tried it with React 15.4.2 (the latest right now), there was almost no difference. In fact, the web worker version might have been a bit slower (remember, it does need to serialize the DOM updates and send them from the worker to the UI thread). This likely has something to do with the simple nature of my test application, but it could also mean that React changed in some way to reduce the effectiveness of `react-worker-dom`.

And it is possible that this will happen again: since `react-worker-dom` is just an experiment (as even the docs say), there's no guarantee that it will stay abreast of React. And React will change (see section on Fiber below). My experience is limited, but I don't think it's a wise idea to use an experimental library in a production app such as RBC's. And I don't think writing a custom libray to do it would have any better success: all the issues that `react-worker-dom` faces (like DOM update serialization and event support) will still need to be addressed. Parashuram N himself [said](https://calendar.perfplanet.com/2016/rise-of-the-web-workers/) that "Running frameworks like React and Angular [in web workers] are still cutting-edge experiments and may not yet be ready for production."

Other significant members of the React community seem to agree. There's [an issue on the React repo](https://github.com/facebook/react/issues/3092) where web workers have been in discussion on and off for two years now. React team member [Sebastian Markbåge outlines his problems with web workers and React elsewhere](https://github.com/facebook/react/issues/7942#issuecomment-254984862).

Instead, most people are looking to React Fiber as the big performance solution.

# React Fiber: The Future

For [close to a year now](https://github.com/facebook/react/issues/6170), the React team has been working on Fiber, a re-write of the core reconciliation algorithm of React. I don't mind admitting that I don't completely understand how it does what it does; there are [several](https://www.youtube.com/watch?v=crM1iRVGpGQ) [great](https://www.youtube.com/watch?v=aV1271hd9ew) [resources](https://github.com/acdlite/react-fiber-architecture) [available](https://gist.github.com/duivvv/2ba00d413b8ff7bc1fa5a2e51c61ba43) online that explain it at different levels. What's important, however, are the features that it brings to the table.

The biggest feature here is scheduling, also called time slicing. Here's my explanation: right now, React Stack (the current version of the reconciliation algorithm), does reconciliation synchronously. This means that when the state of your application changes, and virtual DOM diffing happens, the UI is blocked until that process is done. If this runs long, it will prevent new frames from being rendered, resulting in an unresponsive application. React Fiber will do reconciliation asynchronously, and take advantage of new APIs like `requestIdleCallback` to break up reconciliation between frame renders. This doesn't mean different parts of your UI will re-render independently; the DOM modifications will still happen together. However, it basically means the reconciliation process doesn't block the UI Thread.

There are other features of React Fiber, and many will be about performance and responsiveness. However, it isn't out yet; the current version of React is 15.4.2. According to [Dan Abramov on Jan 23, 2017](https://github.com/facebook/react/issues/8854), React 15.5 will probably be the last 15.x version and React Fiber should be available in React 16. According to [IsFiberReadyYet.com](http://isfiberreadyyet.com/), Fiber is passing 97.8% of React unit tests. It seems plausible that Fiber will be available later this year.

One solution would be to use `react-worker-dom` until React Fiber is available. However, I think there are a few other solutions that should be considered first.

# Current Solutions

There are several techniques for improving the performance of a React application  that will not only provide a speed boost now, but also still be beneficial when React Fiber arrives.

## Avoiding renders with pure `render` functions and `shouldComponentUpdate`

In the excellent blog post [Performance Engineering with React](http://benchling.engineering/performance-engineering-with-react/), Saif Hakim said, "the bottleneck in rendering is often solved by *not* rendering ... vs rendering *faster*." It doesn't matter how fast your reconciliation algorithm is, bypassing reconciliation/re-rendering is always faster.

How can you shortcut diffing and avoid rendering? The biggest answer surprised me: add the `shouldComponentUpdate` lifecycle method to your components. If you can compare props and state and tell React not to re-render a component, React doesn't have to run that component's `render` function and then diff the previous and new results. You are cutting a whole branch off the tree, and this is especially great if it's a long branch, with many components inside it.

Of course, for this to work well, you need to have a few other best practices in place. 

- Your `render` function should be a pure function of the state and props: no using localStorage, outside variables, etc.
- Your data should be immutable: always create new variables, instead of changing old ones.

With these things in place, you can do a shallow comparison between the current and next props and state in the `shouldComponentUpdate` function.

[My research](https://medium.com/@alexandereardon/performance-optimisations-for-react-applications-b453c597b191#.lew1uoo4w) turned up a few other tips to improve on this even more:

- Sometimes, denormalizing your data will make your comparisons easier.
- Don't create props objects for nested components in a parent component's `render` function; a new object every time will result in re-rendering every time.
- Don't create functions in `render`, even arrow functions within props. These are new objects that will trigger a render for that component. There are a few ways to get around this: pass the function reference and its parameters separately, or create a "middle man" component to manage the binding.

If you're using ES6 classes, you can extend the `React.PureComponent` class (instead of `React.Component`) and get a free side-order of `shouldComponentUpdate` that does shallow props and state comparison for you.

I was pretty surprised to learn that adding good `shouldComponentUpdate` methods to your React components can have such strong performance improvements. But if you follow along with [a case study](http://benchling.engineering/deep-dive-react-perf-debugging/), you can see it makes a huge difference.

## Tools: React.perf & Timeline Profiler

Apart from React coding techniques to speed things up, you can take advantage of the [React.Perf](https://facebook.github.io/react/docs/perf.html) add-on to [measure performance](https://medium.com/code-life/how-to-benchmark-react-components-the-quick-and-dirty-guide-f595baf1014c); the best part is the `printWasted` method, which tells you how much time was spent doing diffs of components that didn't need to be re-rendered: these are all prime candidates for `shouldComponentUpdate`.

You can also [learn a lot](http://benchling.engineering/deep-dive-react-perf-debugging/) about your React code with the Timeline and Profile tabs in Chrome Dev Tools. These tools can do so much, and I won't go into it here, but they will probably help you dig out some more performance.

## Compiler Options

One last React-specific thing: there are a few options to [speed up React when it comes to compiling](https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html#compiler-optimizations). Of course, you should be setting `NODE_ENV=production` when building, so that React will compile for production (and also skip PropType validations). But more than that, Babel offers [two React optimisation transformers for JSX](https://babeljs.io/blog/2015/03/31/5.0.0#react-optimisations); the Constant Elements transformer will move constant JSX out of `render` and into a variable: because JSX can be treated as a value type, this can prevent further reconciliation/re-rendering. Then, the Inline Elements transformer will convert JSX to a plain object, instead of a call to `React.createElement` (which would just return that object anyway). Avoiding those function calls is a further speed boost.

## Web Workers for non-React code

Just because web workers aren't right for React, that doesn't mean they can't speed up the application. You mentioned that the application is getting data via a web socket and processing it. All that work can definitely be done in a web worker, leaving the UI thread free for React work. Also, I'm not sure what you're using for store management (Flux, Redux, etc.), but that can probably be done in a web worker as well. If I can quote [Parashuram N](https://calendar.perfplanet.com/2016/rise-of-the-web-workers/) again, "we can continue to convert our services to use web workers – parts of code that are responsible for making backend calls, converting the data into a format that the UI can consume, sync local storage with backend data, etc. Web Workers are well supported today, so they may as well be used!"

## Data Throttling on the Front-End with RxJS

I'm excited about this particular solution: if memory serves, you mentioned that you had tried throttling the data on the server to see what effect that had on performance. Another option would be to throttle the data on the client instead. [RxJS](http://reactivex.io/rxjs/) would be the perfect fit for this: it's a very well-supported library and can easily create an observable stream from a web socket connection. You could throttle the data based on another "flag" observable, so that you when you are rendering, you ignore values coming in from the web socket. When rendering completes, you get the latest value from the observable and start the process over. This way, you can manage the data flow based on the client's abilities: faster and stronger clients will use more data, while older machines will ignore more data but still have a good user experience.

Even if you can't afford to lose intermediate data chunks (maybe the data is cumulative), you can use the `scan` operator so that the latest data chunk will be the product of the previous ones. The observable will always be ready to give the latest data, and the client doesn't have to worry about how fast that data is coming ... and of course, it can all be done in a web worker. It could be a pretty elegant solution.

## React Virtualized

There's also a really cool library called [React Virtualized](https://github.com/bvaughn/react-virtualized) that seems exactly right for this scenario. It efficiently renders large tables by only rendering the currently visible rows. [The demo](https://bvaughn.github.io/react-virtualized/#/components/List) is pretty amazing: I added 10000 rows and made the list height 800px, so you can see 15 items at a time, and you can still scroll through as fast as possible and have no jank at all. With those settings, there were only about 27 rows in the DOM at a given time. I'm not sure how much work it would be to add this library to the application, but it might just be exactly what you need.

# Conclusion

Ultimately, I realize I'm not in a position to say whether using React in web workers is a good idea. I can tell you it is definitely possible. However, if it were up to me, I would be inclined to explore some of these other options first, and see what performance benefits they could bring.