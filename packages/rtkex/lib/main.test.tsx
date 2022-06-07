import React, { PropsWithChildren } from "react";
import { Provider, useDispatch } from "react-redux";
import { AnyAction, Store } from "redux";
import { createSlice, useSelector, configureStore } from "./main";
import { renderHook } from "@testing-library/react-hooks";
import undoable from "redux-undo";
import { expect, test } from "vitest";

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
  const slice = createSlice("counter", 1, {
    increment: (state) => state + 1,
  }).wrap(undoable);

  const store = configureStore((builder) => builder.addSlice(slice));

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

  expect(result.current.count.present).toBe(1);
  result.current.increment();
  expect(result.current.count.present).toBe(2);
});
