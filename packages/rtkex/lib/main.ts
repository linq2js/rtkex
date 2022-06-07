import {
  AnyAction,
  createSlice as createSliceOriginal,
  configureStore as configureStoreOriginal,
  CreateSliceOptions,
  Middleware,
  Reducer,
  Slice,
  SliceCaseReducers,
  Store,
  StoreEnhancer,
  combineReducers,
} from "@reduxjs/toolkit";
import { useState } from "react";
import { EqualityFn, useSelector as selectorHook, useStore } from "react-redux";

export * from "@reduxjs/toolkit";

export type Selector<TName extends string, TState> = (state: {
  [key in TName]: TState;
}) => TState;

export interface WrappedSlice<TName, TState, TActions, TSelector> {
  name: TName;
  getInitialState(): TState | undefined;
  actions: TActions;
  selector: TSelector;
  reducer: Reducer<TState>;
}

export interface EnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> extends Slice<TState, TCaseReducers, TName> {
  dependencies?: SliceInfo[];

  /**
   * a selector that returns state of slice from root state
   * @param state
   */
  selector(state: { [key in TName]: TState }): TState;

  /**
   * create new selector with innerSelector. The innerSelector retrieves state of slice and returns selected value
   * @param innerSelector
   */
  selector<TSelected>(
    innerSelector: (selected: TState) => TSelected
  ): (state: { [key in TName]: TState }) => TSelected;

  /**
   * wrap the reducer of the slice with high order reducer
   * @param highOrderReducer
   * @param initialState
   */
  wrap<S>(
    highOrderReducer: (reducer: Reducer<TState>) => Reducer<S>,
    initialState?: S
  ): WrappedSlice<
    TName,
    S,
    Slice<TState, TCaseReducers, TName>["actions"],
    Selector<TName, S>
  >;
}

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

  <TSelected>(
    slide: EnhancedSlice<TSelected>,
    equalityFn?: EqualityFn<TSelected> | undefined
  ): TSelected;
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
  > & { dependencies?: Slice[] }
): ClonableEnhancedSlice<TState, TCaseReducers, TName> => {
  const slice = createSliceOriginal({
    ...options,
    name,
    initialState,
    reducers,
  });

  const selector = (state: any) => {
    // a curry call so we create new selector
    if (typeof state === "function") {
      const customSelector = state;
      return (state: any) => customSelector(state[slice.name]);
    }
    return state[slice.name];
  };

  return {
    ...slice,
    selector,
    wrap(highOrderReducer, initialState) {
      return {
        name: slice.name,
        actions: slice.actions,
        selector,
        getInitialState: () => initialState,
        reducer: highOrderReducer(this.reducer),
      };
    },
    dependencies: options?.dependencies ?? [],
    clone<TNewName extends string>(newName: TNewName) {
      return createSlice(newName, initialState, reducers, options);
    },
  };
};

export const useSelector: UseSelector = (...args: any[]) => {
  if (typeof args[0] === "function") {
    return selectorHook(args[0], args[1]);
  }
  if (
    args[0].name &&
    args[0].reducer &&
    typeof args[0].selector === "function"
  ) {
    return selectorHook(args[0].selector, args[1]);
  }
  return selectorHook(combineSelectors(args[0], args[1]), args[2]);
};

export type DynamicBuildCallback = (
  builder: Pick<StoreBuilder, "addSlice" | "addReducer">
) => void;

export interface Injector extends Function {
  (builder: StoreBuilder): void;
  inject(buildCallback: DynamicBuildCallback): void;
}

export interface SliceInfo<
  TName extends string = string,
  TState = any,
  TActions = {}
> {
  name: TName;
  reducer: Reducer<TState>;
  actions: TActions;
  dependencies?: SliceInfo[];
}

export interface StoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  addSlice<S = any, N extends string = string, A = any>(
    slice: SliceInfo<N, S, A>
  ): StoreBuilder<TState & { [key in N]: S }, TAction | { type: string }>;

  addMiddleware(...middleware: Middleware[]): this;

  addReducer<S, A extends AnyAction>(
    reducer: Reducer<S, A>
  ): StoreBuilder<TState & S, TAction | A>;

  setPreloadedState<S>(state: S): StoreBuilder<TState & S, TAction>;

  enableDevTools(enabled: boolean): this;

  enableDevTools(options: {}): this;

  addEnhancers(...enhancers: StoreEnhancer[]): this;
}

export type BuildCallback<
  TState = any,
  TAction extends AnyAction = AnyAction
> = (builder: StoreBuilder<{}, never>) => StoreBuilder<TState, TAction>;

interface InternalStoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> extends StoreBuilder<TState, TAction> {
  build(buildCallback: (builder: this) => any, force?: boolean): void;
}

const createStoreBuilder = (
  onBuild: (data: {
    token: any;
    enhancers: StoreEnhancer[];
    middleware: Middleware[];
    reducers: Reducer[];
    reducerMap: Record<string, Reducer>;
    preloadedState: any;
    devTools: any;
  }) => void
): InternalStoreBuilder<any, any> => {
  let token = {};
  let reducerMap: Record<string, Reducer> = {};
  let reducers: Reducer[] = [];
  let middleware: Middleware[] = [];
  let enhancers: StoreEnhancer[] = [];
  let devTools: any;
  let preloadedState: any = {};
  let prevToken = token;

  const addSlice = (inputSlice: SliceInfo) => {
    if (reducerMap[inputSlice.name] !== inputSlice.reducer) {
      reducerMap = { ...reducerMap, [inputSlice.name]: inputSlice.reducer };
      token = {};
      if (inputSlice.dependencies?.length) {
        inputSlice.dependencies.forEach(addSlice);
      }
    }
  };

  return {
    build(buildCallback, force) {
      prevToken = token;
      buildCallback(this);
      if (!force && prevToken === token) return;
      prevToken = token;

      onBuild({
        token,
        reducerMap,
        reducers,
        middleware,
        enhancers,
        preloadedState,
        devTools,
      });

      return;
    },
    addMiddleware(...inputMiddleware) {
      const newMiddleware = inputMiddleware.filter(
        (x) => !middleware.includes(x)
      );
      if (newMiddleware.length) {
        middleware = middleware.concat(newMiddleware);
        token = {};
      }
      return this;
    },
    addEnhancers(...input) {
      const newEnhancers = input.filter((x) => !enhancers.includes(x));
      if (newEnhancers.length) {
        enhancers = enhancers.concat(newEnhancers);
        token = {};
      }
      return this;
    },
    addSlice(inputSlice) {
      addSlice(inputSlice);
      return this;
    },
    addReducer(inputReducer: any) {
      if (!reducers.includes(inputReducer)) {
        reducers = reducers.concat(inputReducer);
        token = {};
      }
      return this;
    },
    enableDevTools(input: any) {
      devTools = input;
      return this;
    },
    setPreloadedState(state) {
      if (preloadedState !== state) {
        preloadedState = state;
        token = {};
      }
      return this;
    },
  };
};

/**
 * A hook that can access store builder of current store. Use store builder for adding reducers or slides dynamically
 * @param buildCallbacks
 */
export const useBuilder = (...buildCallbacks: DynamicBuildCallback[]) => {
  const store = useStore();

  useState(() => {
    const builder = (store as any).builder as InternalStoreBuilder;
    if (!builder) throw new Error("The current store does not support builder");
    builder.build(() => buildCallbacks.forEach((x) => x(builder)));
  });
};

export const configureStore = <TState, TAction extends AnyAction>(
  buildCallback?: BuildCallback<TState, TAction>
): Store<TState, TAction> => {
  let store: Store<TState, TAction> | undefined;

  const builder = createStoreBuilder(
    ({
      preloadedState,
      reducerMap,
      reducers,
      middleware,
      enhancers,
      devTools,
    }) => {
      if (Object.keys(reducerMap).length) {
        reducers.push(combineReducers(reducerMap));
      }
      const reducer = (state: TState | undefined, action: TAction) => {
        for (const r of reducers) {
          state = r(state, action);
        }
        return state as TState;
      };
      if (store) {
        store.replaceReducer(reducer);
      } else {
        store = configureStoreOriginal({
          preloadedState,
          reducer,
          devTools,
          enhancers,
          middleware,
        });
      }
    }
  );

  builder.build(buildCallback ?? ((builder) => builder), true);

  if (store) {
    Object.assign(store, { builder });
  }

  return store as Store<TState, TAction>;
};
