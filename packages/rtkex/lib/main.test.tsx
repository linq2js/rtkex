import { configureStore } from "@reduxjs/toolkit";
import { PropsWithChildren } from "react";
import { Provider, useDispatch } from "react-redux";
import { AnyAction, Store } from "redux";
import { createSlice, useSelector } from "./main";
import { renderHook } from "@testing-library/react-hooks";

function createWrapper<T, A extends AnyAction>(store: Store<T, A>) {
  return (props: PropsWithChildren<void>) => (
    <Provider store={store}>{props.children}</Provider>
  );
}

test("noop", () => {
  const elemnt = <div />;
  expect(elemnt).not.toBeUndefined();
});

test("createSlice", () => {
  const slice = createSlice("counter", 1, { increment: (state) => state + 1 });
  const store = configureStore({
    reducer: {
      ...slice.reducerProps,
    },
  });
  const { result } = renderHook(
    () => {
      const dispatch = useDispatch();
      return {
        count: useSelector(slice.selector),
        increment: () => dispatch(slice.actions.increment()),
      };
    },
    { wrapper: createWrapper(store) }
  );

  expect(result.current.count).toBe(1);
  result.current.increment();
  expect(result.current.count).toBe(2);
});
