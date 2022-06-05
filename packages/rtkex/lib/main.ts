import {
  createSlice as createSliceOriginal,
  CreateSliceOptions,
  Slice,
  SliceCaseReducers,
} from "@reduxjs/toolkit";
import { EqualityFn, useSelector as selectorHook } from "react-redux";

export type EnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> = Slice<TState, TCaseReducers, TName> & {
  selector: (state: { [key in TName]: TState }) => TState;
  reducerProps: {
    [key in TName]: Slice<TState, TCaseReducers, TName>["reducer"];
  };
};

export type ClonableEnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> = EnhancedSlice<TState, TCaseReducers, TName> & {
  /**
   * make a copy of current slice but with new name
   * @param newName
   * @returns
   */
  clone<TNewName extends string>(
    newName: TNewName
  ): ClonableEnhancedSlice<TState, TCaseReducers, TNewName>;
};

export type Combiner<TSelectors, TResult> = (values: {
  [key in keyof TSelectors]: TSelectors[key] extends EnhancedSlice
    ? ReturnType<TSelectors[key]["selector"]>
    : TSelectors[key] extends (state: any) => infer T
    ? T
    : never;
}) => TResult;

export type UseSelector = {
  /**
   * A hook to access the redux store's state. This hook takes a selector function
   * as an argument. The selector is called with the store state.
   *
   * This hook takes an optional equality comparison function as the second parameter
   * that allows you to customize the way the selected state is compared to determine
   * whether the component needs to be re-rendered.
   *
   * @param {Function} selector the selector function
   * @param {Function=} equalityFn the function that will be used to determine equality
   *
   * @returns {any} the selected state
   *
   * @example
   *
   * import React from 'react'
   * import { useSelector } from 'rtkex'
   *
   * export const CounterComponent = () => {
   *   const counter = useSelector(state => state.counter)
   *   return <div>{counter}</div>
   * }
   */
  <TState = unknown, TSelected = unknown>(
    selector: (state: TState) => TSelected,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;

  /**
   * A hook to access the redux store's state. This hook takes a selectors and combiner function
   * as an arguments. The selector will be created by passing selectors and combiner to combineSelectors.
   */
  <TSelectors, TSelected>(
    selectors: TSelectors,
    combiner: Combiner<TSelectors, TSelected>,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;
};

export const enhanceSlice = <
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
>(
  slice: Slice<TState, TCaseReducers, TName>
): EnhancedSlice<TState, TCaseReducers, TName> => {
  return {
    ...slice,
    selector: (state) => state[slice.name],
    reducerProps: { [slice.name]: slice.reducer } as any,
  };
};

/**
 * combine multiple selectors/slice selectors into one selector
 * @param selectors
 * @param combiner
 * @returns
 */
export const combineSelectors = <TSelectors, TResult>(
  selectors: TSelectors,
  combiner: Combiner<TSelectors, TResult>
) => {
  const entries = Object.entries(selectors);
  return (state: any): TResult => {
    const selected: any = {};
    entries.forEach(([key, selector]) => {
      selected[key] =
        typeof selector === "function"
          ? selector(state)
          : selector.selector(state);
    });
    return combiner(selected);
  };
};

/**
 * create a slice that includes enhanced props
 * @param name
 * @param initialState
 * @param options
 * @returns
 */
export const createSlice = <
  TState,
  TCaseReducers extends SliceCaseReducers<TState>,
  TName extends string = string
>(
  name: TName,
  initialState: TState,
  reducers: CreateSliceOptions<TState, TCaseReducers, TName>["reducers"],
  options?: Omit<
    CreateSliceOptions<TState, TCaseReducers, TName>,
    "name" | "initialState" | "reducers"
  >
): ClonableEnhancedSlice<TState, TCaseReducers, TName> => {
  const slice = createSliceOriginal({
    ...options,
    name,
    initialState,
    reducers,
  });
  return Object.assign(enhanceSlice(slice), {
    clone<TNewName extends string>(newName: TNewName) {
      return createSlice(newName, initialState, reducers, options);
    },
  });
};

export const useSelector: UseSelector = (...args: any[]) => {
  if (typeof args[0] === "function") {
    return selectorHook(args[0], args[1]);
  }
  return selectorHook(combineSelectors(args[0], args[1]), args[2]);
};
