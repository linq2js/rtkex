- [`RTKex`](#rtkex)
  - [Installation](#installation)
  - [Recipes](#recipes)
    - [New store confugration method](#new-store-confugration-method)
    - [New slice implementation](#new-slice-implementation)
    - [Slice selector](#slice-selector)
    - [Slice dependency logic](#slice-dependency-logic)
    - [Dynamic adding slice to the store](#dynamic-adding-slice-to-the-store)
    - [Slice Ready Event](#slice-ready-event)
    - [Loadable slice](#loadable-slice)
    - [High Order Reducer](#high-order-reducer)
  - [API references](#api-references)

# `RTKex`

An extension for [Redux Toolkit](https://redux-toolkit.js.org/)

## Installation

**with NPM**

```bash
npm i rtkex --save
```

**with YARN**

```bash
yarn add rtkex
```

## Recipes

### New store confugration method

RTKex provides a new configreStore(), it accepts buildCallback that retrieves a builder object as its argument. The builder object provides methods for registering slice, reducer, middleware, etc.

```js
import { configureStore } from "rtkex";

const store = configureStore((builder) =>
  builder
    .withSlice(slice1)
    .withSlice(slice2)
    .withMiddleware(middleware1, middleware2)
    .withReducer(reducer1)
    .withReducer(reducer2)
    .withDevTools(enabled) // or .withDevTools(devToolsOptions)
    .withEnhancers(enhancer1, enhancer2)
);
```

### New slice implementation

RTKex has new implementation of createSlice, it retrieves following parameters createSlice(name, initialState, reducers, options).
RTKex also provides some extra properties for slice object

```js
import { createSlice, configureStore } from "rtkex";

const counterSlice = createSlice(
  // slide name, where to put data in the app state tree
  "count",
  // initial state
  1,
  // main reducers
  {
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
  },
  // options
  {
    extraReducers: (builder) => {},
  }
);

// register the slice to the store with ease
const store = configureStore((builder) => builder.withSlice(counterSlice));
// with RTK you should do
// configureStore({  reducer: { count: counterSlice.reducer } })

// now the store has following state tree {  count: 1 }
```

### Slice selector

The slice has built-in selector slice.select() function, that uses to select the state of slice from app state tree. You also pass custom selector to select() function

```js
import { useSelector } from "rtkex";

const count1 = counterSlice.select(store.getState());
const count2 = useSelector(counterSlice);
const count3 = useSelector(counterSlice.select);
// using custom selector with default selector
const doubleCount = useSelector(counterSlice.select((count) => count * 2));
```

### Slice dependency logic

A slice can depend on one or many other slices. When configuring the store, you just need to add dependent slices, all their dependencies will be added as well

```js
import { createSlice, configureStore } from "rtkex";

const slice1 = createSlice("slice1", 0, {});
const slice2 = createSlice("slice2", 0, {}, { dependencies: [slice1] });
// no need to add slice1
configureStore((builder) => builder.withSlice(slice2));
```

### Dynamic adding slice to the store

```js
// create a store wihout any slice
const store = configureStore();

// counter.js
import { useBuilder, useSelector } from "rtkex";
import counterSlice from "./slices/counterSlice";

const withCounterSlice = (builder) =>
  function Counter() {
    // easy ?
    useBuilder((builder) => builder.withSlice(counterSlice));
    // use the slice afterward
    const count = useSelector(counterSlice);
    return <div>{count}</div>;
  };
```

### Slice Ready Event

Slice Ready Event uses to handle something whenever the slice added to the store

```js
const mySlice = createSlice().onReady((storeApi, slice) => {
  // dispatch an action
  storeApi.dispatch(action);
  // get the current store state
  storeApi.getState();
});
```

### Loadable slice

Redux toolkit supports createAsyncThunk but it is complicated to use. RTKex wraps slice and thunk logics into one place, it is loadable slice

```js
import { createLoadableSlice, configureStore, useSelector } from "rtkex";
import { userAPI } from "./userAPI";

const userListSlice = createLoadableSlice(
  "users",
  async (userId: number, thunkAPI) => {
    const response = await userAPI.fetchById(userId);
    return response.data;
  }
);

const store = configureStore((builder) => builder.withSlide(userListSlice));
// load users outside component
store.dispatch(userListSlice.actions.load(123));

// load users inside component
const dispatch = useDispatch();
useEffect(() => {
  dispatch(userListSlice.actions.load(123));
}, [dispatch]);

// load users once when the slice is added to the store
const userListSlice = createLoadableSlice(/* ... */).onReady(
  (storeApi, slice) => {
    storeApi.dispatch(slice.actions.load(123));
  }
);

const userList = useSelector(userListSlice);

console.log(userList);
/*
  loadable object has following properties
  {
    data: [...],
    loading: false,
    idle: false,
    loaded: true,
    error: undefined
  }
*/
```

RTKex also supports Suspense and error boundary for loadable slice

```jsx
const UserList = () => {
  // when using selectData selector RTKex will throw a promise if slice is still loading and throw an error if slice has been failed
  const userList = useSelector(userListSlice.selectData);
  // the userList value is loadable.data not loadable object
  console.log(userList); // [...]
};

<Suspense fallback="Loading...">
  <UserList />
</Suspense>;
```

If you need to add more actions for loadable slice, just use following code:

```js
const userListSlice = createLoadableSlice(
  "users",
  async (userId: number, thunkAPI) => {
    const response = await userAPI.fetchById(userId);
    return response.data;
  },
  // options
  {
    reducers: {
      // clear user list action
      // the state is loadable.data
      clear: (state) => [],
    },
    // you also define extraReducers to handler external actions
    extraReducers: (builder) =>
      // clear user list when logout action is dispatched
      builder.addCase(logoutAction, (state) => []),
  }
);
```

### High Order Reducer

RTKex slice can work with HOR ease

```js
import undoable from "redux-undo";
import { createSlice } from "rtkex";

const counterSlice = createSlice().wrap(undoable);
```

## API references

https://linq2js.github.io/rtkex/
