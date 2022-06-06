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

## Usages

```js
import {
  configureStore,
  createSlice,
  combineSelectors,
  useSelector,
} from "rtkex";

const counterSlice = createSlice("counter", 1, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
});

const ASlice = createSlice("A", 1, { increment: (state) => state + 1 });
const BSlice = createSlice("B", 2, { increment: (state) => state + 1 });
const sumSelector = combineSelectors(
  {
    // pass slice directly
    A: ASlice,
    B: BSlice,
    // or pass selector function
    count: counterSlice.selector,
  },
  (/* selected  */ { A, B, count }) => A + B + count
);

// create store with enhanced slices
const store = configureStore((builder) =>
  builder.addSlice(ASlice).addSlice(BSlice)
);

// using slice's selector to retrieve count state
const count = useSelector(counterSlice.selector);
const sum1 = useSelector(sumSelector);
const sum2 = useSelector(
  {
    A: ASlice,
    B: BSlice,
    count: counterSlice.selector,
  },
  ({ A, B, count }) => A + B + count
);
```

## Documentations

https://linq2js.github.io/rtkex/
