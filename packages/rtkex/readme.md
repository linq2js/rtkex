# `rtkex`

A Redux Toolkit Extension

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

1. New slice dependency logic
2. New slice selector logic
3. New store building logic
4. Support adding slice / reducer dynamically
5. New useSelector implementation
6. Support loadable slice
7. Support suspense and error boundary

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
  builder.addSlice(counterSlice)
);

// retrieve state of slice
const count1 = useSelector(counterSlice);
const count2 = useSelector(counterSlice.selector);
const doubleCount = useSelector(
  // passing inner selector to slice selector
  counterSlice.selector((count) => count * 2)
);
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
  "sliceA",
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
  builder.addSlice(sliceA).addSlice(sliceB)
);
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

const store = configureStore((builder) => builder.addSlice(userListSlice));
// load user
store.dispatch(userListSlice.actions.load(123));

const userList = useSelector(userListSlice);

console.log(userList.data);
console.log(userList.error);
console.log(userList.status);
console.log(userList.isIdle);
console.log(userList.isLoading);
console.log(userList.isLoaded);
console.log(userList.isFailed);
```

## Documentations

https://linq2js.github.io/rtkex/
