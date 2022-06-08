# `RTKex`

A (Redux Toolkit)[https://redux-toolkit.js.org/] Extension

## Installation

**with NPM**

```bash
npm i rtkex --save
```

**with YARN**

```bash
yarn add rtkex
```

## Features

- New slice dependency logic
- New slice selector logic
- New store building logic
- Support adding slice / reducer dynamically
- New useSelector implementation
- Support loadable slice
- Support suspense and error boundary
- Support onReady event for slice

## Usages

### Counter App

```jsx
import { configureStore, createSlice, useSelector } from "rtkex";

const counterSlice = createSlice(
  // slide name
  "counter",
  // slide initial state
  1,
  // reducers
  {
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
  }
);

const store = configureStore((builder) =>
  // add counterSlide to the store
  builder.withSlide(counterSlice)
);

// retrieve state of slice
const count1 = useSelector(counterSlice);
const count2 = useSelector(counterSlice.select);
const doubleCount = useSelector(
  // passing inner selector to slice selector
  counterSlice.select((count) => count * 2)
);

// dispatching actions
const dispatch = useDispatch();
dispatch(counterSlice.actions.increment());
dispatch(counterSlice.actions.decrement());
```

### Slice Dependency

Let say you orignaize your project as following structure

```
  features/
    util/
      slices/
        utilSlice.js
    A/
      slices/
        sliceA.js
    B/
      slices/
        sliceB.js
```

Both of sliceA and sliceB depdend on utilSlice

sliceA.js

```js
import utilSlice from "./features/util/slices/utilSlice";
const sliceA = createSlice(
  "sliceA",
  undefined,
  {
    /* reducer logics here */
  },
  { dependencies: [utilSlice] }
);
```

**sliceB.js**

```js
import utilSlice from "./features/util/slices/utilSlice";
const sliceB = createSlice(
  "sliceB",
  undefined,
  {
    /* reducer logics here */
  },
  { dependencies: [utilSlice] }
);
```

**store.js**

```js
import sliceA from "./features/A/slices/sliceA";
import sliceB from "./features/B/slices/sliceB";

const store = configureStore((builder) =>
  // no need to add utilSlice here because it will be added whenever sliceA or sliceB added to the store
  // and the utilSlice will be added once
  builder.withSlide(sliceA).withSlide(sliceB)
);
```

### Dynamic adding slice to the store

```js
// create a store wihout any slice
const store = configureStore();

// counter.js
import { useBuilder, useSelector } from "rtkex";
import counterSlice from "./slices/counterSlice";

function Counter() {
  // easy ?
  useBuilder((builder) => builder.withSlice(counterSlice));
  // use the slice afterward
  const count = useSelector(counterSlice);
}
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

If you need to add more actions for loadable slice, just following:

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

## Documentations

https://linq2js.github.io/rtkex/
