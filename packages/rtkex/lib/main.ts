import {
  AnyAction,
  CreateSliceOptions,
  Middleware,
  Reducer,
  Slice,
  SliceCaseReducers,
  Store,
  StoreEnhancer,
  AsyncThunkPayloadCreator,
  AsyncThunkOptions,
  Dispatch,
  ValidateSliceCaseReducers,
  ActionReducerMapBuilder,
  CaseReducers,
  MiddlewareAPI,
  createListenerMiddleware,
  addListener,
} from "@reduxjs/toolkit";
import {
  createSlice as createSliceOriginal,
  configureStore as configureStoreOriginal,
  combineReducers,
  createAsyncThunk,
  createAction,
  original,
  isDraft,
} from "@reduxjs/toolkit";
import type {
  GuardedType,
  ListenerEffect,
  ListenerPredicate,
  ListenerPredicateGuardedActionType,
  MatchFunction,
} from "@reduxjs/toolkit/dist/listenerMiddleware/types";
import { NoInfer } from "@reduxjs/toolkit/dist/tsHelpers";
import { createElement, memo, useState } from "react";
import { EqualityFn, useSelector as selectorHook, useStore } from "react-redux";

export * from "@reduxjs/toolkit";

const onBuildCallbackSymbol = Symbol("onBuildCallback");
const onReadyCallbackSymbol = Symbol("onReadyCallback");

export type SelectableSlice<T> = { select: (state: any) => T };

export type DataSelectableSlice<T> = { selectData: (state: any) => T };

export type DispatchableSlice<A> = { actions: A };

export type Selector<TName extends string, TState, TSelected = TState> = (
  state: SelectorState<TName, TState>
) => TSelected;

export interface WrappedSlice<
  TName extends string,
  TState,
  TActions,
  TSelector extends Selector<any, any, TState>
> extends SliceBase<TName, TState, TActions>,
    SelectableSlice<TState> {
  select: TSelector;
  reducer: Reducer<TState>;
}

export interface EnhancedSlice<
  TState = any,
  TCaseReducers extends SliceCaseReducers<TState> = SliceCaseReducers<TState>,
  TName extends string = string
> extends Slice<TState, TCaseReducers, TName>,
    SelectableSlice<TState> {
  /**
   * a selector that returns state of slice from root state
   * @param state
   */
  select: Selector<TName, TState>;

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

  onReady: OnReady<this>;

  onBuild: OnBuild<this>;
}

export type ClonableSlice<
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
  ): ClonableSlice<TState, TCaseReducers, TNewName>;
};

export type Combiner<TSelectors, TResult> = (values: {
  [key in keyof TSelectors]: TSelectors[key] extends EnhancedSlice
    ? ReturnType<TSelectors[key]["select"]>
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

export type DynamicBuildCallback<
  TContext = void,
  TBuilder = Pick<StoreBuilder, "withSlice" | "withReducer">
> = (builder: TBuilder, context: TContext) => void;

export interface SliceBase<
  TName extends string = string,
  TState = any,
  TActions = {}
> {
  name: TName;
  reducer: Reducer<TState>;
  actions: TActions;
  listeners?: Listener[];
  getInitialState(): TState | undefined;
  onBuild: OnBuild<this>;
  onReady: OnReady<this>;
}

export interface Action<T = any> {
  type: T;
}

export interface StoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> {
  /**
   * add slice to the store
   * @param slice
   */
  withSlice<S = any, N extends string = string, A = any>(
    slice: SliceBase<N, S, A>
  ): StoreBuilder<TState & { [key in N]: S }, TAction | { type: string }>;

  /**
   * add specified middleware after default middleware
   * @param middleware
   */
  withMiddleware(...middleware: Middleware[]): this;

  /**
   * add specified middleware before default middleware
   * @param middleware
   */
  withPreMiddleware(...middleware: Middleware[]): this;

  /**
   * add custom reducer to the store
   * @param reducer
   */
  withReducer<S, A extends AnyAction>(
    reducer: Reducer<S, A>
  ): StoreBuilder<TState & S, TAction | A>;

  /**
   *
   * @param state
   */
  withPreloadedState<S>(state: S): StoreBuilder<TState & S, TAction>;

  withDevTools(enabled: boolean): this;

  withDevTools(options: {}): this;

  withEnhancers(...enhancers: StoreEnhancer[]): this;

  withErrorCallbacks(...callbacks: ErrorCallback[]): this;

  withListeners(...listeners: Listener[]): this;

  withListener: ListenerOverloads<this>;
}

export type ReadyCallback<T = any> = (api: MiddlewareAPI, context: T) => void;

export type BuildCallback<
  TState = any,
  TAction extends AnyAction = AnyAction
> = (builder: StoreBuilder<{}, never>) => StoreBuilder<TState, TAction>;

export type AsyncThunkConfig = {
  state?: unknown;
  dispatch?: Dispatch;
  extra?: unknown;
  rejectValue?: unknown;
  serializedErrorType?: unknown;
  pendingMeta?: unknown;
  fulfilledMeta?: unknown;
  rejectedMeta?: unknown;
};

export type SelectorState<TName extends string, TState> = {
  [key in TName]: TState;
};

export type LoadableSlice<
  TName extends string,
  TState,
  TArg,
  TCaseReducers extends SliceCaseReducers<TState>
> = EnhancedSlice<Loadable<TState>, {}, TName> & {
  selectData: Selector<TName, Loadable<TState>, TState>;
  actions: Slice<TState, TCaseReducers, TName>["actions"] & {
    cancel(): AnyAction;
    load(payload: TArg): AnyAction;
    loaded(): AnyAction;
    failed(): AnyAction;
    loading(): AnyAction;
    clearError(): AnyAction;
  };
};

export type LoadableLoader<
  TState,
  TArg = void,
  TApiConfig extends AsyncThunkConfig = {}
> = AsyncThunkPayloadCreator<TState, TArg, TApiConfig>;

export type LoadableOptions<
  TState = any,
  TThunkArg = void,
  ThunkApiConfig = any,
  TCaseReducers extends SliceCaseReducers<TState> = any
> = AsyncThunkOptions<TThunkArg, ThunkApiConfig> & {
  initialState?: TState;
  reducers?: ValidateSliceCaseReducers<TState, TCaseReducers>;
  extraReducers?:
    | CaseReducers<NoInfer<TState>, any>
    | ((builder: ActionReducerMapBuilder<NoInfer<TState>>) => void);
};

export type CreateLoadableSlice = {
  /**
   * create loadable slice without API config
   */
  <
    TName extends string,
    TState,
    TCaseReducers extends SliceCaseReducers<TState>,
    TArg = void
  >(
    name: TName,
    loader: LoadableLoader<TState | Promise<TState>, TArg, {}>,
    options?: LoadableOptions<TState, TArg, {}, TCaseReducers>
  ): LoadableSlice<TName, TState, TArg, TCaseReducers>;

  /**
   * create loadable slice with API config
   */
  <
    TName extends string,
    TState,
    TArg,
    TCaseReducers extends SliceCaseReducers<TState>,
    TApiConfig extends AsyncThunkConfig
  >(
    name: TName,
    loader: LoadableLoader<TState | Promise<TState>, TArg, TApiConfig>,
    options?: LoadableOptions<TState, TArg, TApiConfig, TCaseReducers>
  ): LoadableSlice<TName, TState, TArg, TCaseReducers>;
};

export type Listener = {
  actionCreator?: any;
  predicate?: any;
  effect?: any;
  matcher?: any;
  type?: any;
};

export type Callback<T = any> = (e: T) => void;

export interface Loadable<T = any> {
  loading: boolean;
  idle: boolean;
  loaded: boolean;
  failed: boolean;
  status: "idle" | "loading" | "failed" | "loaded";
  data: T;
  error?: any;
}

export type OnReady<TContext> = (
  readyCallback: ReadyCallback<TContext>
) => TContext;

export type OnBuild<TContext> = (
  buildCallback: DynamicBuildCallback<
    TContext,
    Pick<
      StoreBuilder,
      | "withSlice"
      | "withReducer"
      | "withListener"
      | "withErrorCallbacks"
      | "withListeners"
    >
  >
) => TContext;

interface InternalStoreBuilder<
  TState = any,
  TAction extends AnyAction = AnyAction
> extends StoreBuilder<TState, TAction> {
  build(buildCallback: (builder: this) => any, force?: boolean): void;
}

interface InternalLoadable<T = any> extends Loadable<T> {
  meta?: {
    requestId?: any;
    extra?: {
      abort?: Function;
      defer?: ReturnType<typeof createDefer>;
    };
  };
}

export type ListenerOverloads<R> = <T>(
  when: T,
  effect: /** Accepts an RTK action creator, like `incrementByAmount` */
  T extends (...args: any[]) => any
    ? ListenerEffect<ReturnType<T>, any, Dispatch, any>
    : T extends { predicate: infer LP }
    ? /** Accepts a "listener predicate" that is also a TS type predicate for the action*/
      LP extends ListenerPredicate<AnyAction, any>
      ? ListenerEffect<
          ListenerPredicateGuardedActionType<LP>,
          any,
          Dispatch,
          any
        >
      : /** Accepts a "listener predicate" that just returns a boolean, no type assertion */
        ListenerEffect<AnyAction, any, Dispatch, any>
    : /** Accepts an RTK matcher function, such as `incrementByAmount.match` */
    T extends { matcher: infer M }
    ? M extends MatchFunction<AnyAction>
      ? ListenerEffect<GuardedType<M>, any, Dispatch, any>
      : never
    : /** Accepts an RTK action creator, like `incrementByAmount` */
    T extends { type: infer TTYpe }
    ? ListenerEffect<Action<TTYpe>, any, Dispatch, any>
    : never
) => R;

export const createListener: ListenerOverloads<Listener> = (when, effect) => {
  if (typeof when === "function") {
    return { actionCreator: when, effect };
  }
  return { ...when, effect };
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

const createSliceSelector =
  (originalSelector: (state: any) => any) => (input: any) => {
    if (typeof input === "function") {
      return (state: any) => input(originalSelector(state));
    }
    return originalSelector(input);
  };

const createCallbackGroup = <T>() => {
  const callbacks: Callback<T>[] = [];
  return Object.assign(
    (e: T) => {
      callbacks.forEach((callback) => callback(e));
    },
    {
      add(...newCallbacks: Callback<T>[]) {
        callbacks.push(...newCallbacks);
      },
    }
  );
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
): ClonableSlice<TState, TCaseReducers, TName> => {
  const slice = createSliceOriginal({
    ...options,
    name,
    initialState,
    reducers,
  });

  const select = createSliceSelector((state) => state[slice.name]);

  return {
    ...slice,
    onReady,
    onBuild,
    select: select,
    wrap(highOrderReducer, initialState) {
      return {
        [onReadyCallbackSymbol]: (this as any)[onBuildCallbackSymbol],
        [onBuildCallbackSymbol]: (this as any)[onBuildCallbackSymbol],
        name: slice.name,
        actions: slice.actions,
        select,
        getInitialState: () => initialState,
        reducer: highOrderReducer(this.reducer),
        onReady,
        onBuild,
      };
    },
    clone<TNewName extends string>(newName: TNewName) {
      return createSlice(newName, initialState, reducers, options);
    },
  };
};

export const useSelector: UseSelector = (...args: any[]) => {
  // is selector
  if (typeof args[0] === "function") {
    return selectorHook(args[0], args[1]);
  }
  // is slice
  if (
    args[0].name &&
    args[0].reducer &&
    typeof args[0].selector === "function"
  ) {
    return selectorHook(args[0].selector, args[1]);
  }
  // is combineSelectors arguments
  return selectorHook(combineSelectors(args[0], args[1]), args[2]);
};

const createStoreBuilder = (
  addListener: (listener: Listener) => void,
  onBuild: (data: {
    token: any;
    enhancers: StoreEnhancer[];
    middleware: Middleware[];
    preMiddleware: Middleware[];
    reducers: Reducer[];
    reducerMap: Record<string, Reducer>;
    preloadedState: any;
    devTools: any;
    readyHandlers: Function[];
    errorCallbacks: Callback[];
  }) => void
): InternalStoreBuilder<any, any> => {
  let token = {};
  let reducerMap: Record<string, Reducer> = {};
  let reducers: Reducer[] = [];
  let middleware: Middleware[] = [];
  let preMiddleware: Middleware[] = [];
  let enhancers: StoreEnhancer[] = [];
  let devTools: any;
  let preloadedState: any = {};
  let allReadyHandlers = new Set<Function>();
  let prevToken = token;
  let builder: InternalStoreBuilder<any, any>;
  let errorCallbacks: ErrorCallback[] = [];

  const addSlice = (slice: SliceBase) => {
    if (reducerMap[slice.name] === slice.reducer) return;
    token = {};
    // collect ready handlers
    reducerMap = { ...reducerMap, [slice.name]: slice.reducer };
    if ((slice as any)[onBuildCallbackSymbol]) {
      (slice as any)[onBuildCallbackSymbol](builder);
    }

    if ((slice as any)[onReadyCallbackSymbol]) {
      allReadyHandlers.add((slice as any)[onReadyCallbackSymbol]);
    }
  };

  builder = {
    build(buildCallback, force) {
      prevToken = token;
      buildCallback(this);
      if (!force && prevToken === token) return;
      prevToken = token;

      const readyHandlers = Array.from(allReadyHandlers);
      allReadyHandlers.clear();

      onBuild({
        token,
        reducerMap,
        reducers,
        middleware,
        preMiddleware,
        enhancers,
        preloadedState,
        devTools,
        readyHandlers,
        errorCallbacks,
      });
      errorCallbacks = [];

      return;
    },
    withErrorCallbacks(...callbacks) {
      errorCallbacks.push(...callbacks);
      token = {};
      return this;
    },
    withPreMiddleware(...inputMiddleware) {
      const newMiddleware = inputMiddleware.filter(
        (x) => !preMiddleware.includes(x)
      );
      if (newMiddleware.length) {
        preMiddleware = preMiddleware.concat(newMiddleware);
        token = {};
      }
      return this;
    },
    withMiddleware(...inputMiddleware) {
      const newMiddleware = inputMiddleware.filter(
        (x) => !middleware.includes(x)
      );
      if (newMiddleware.length) {
        middleware = middleware.concat(newMiddleware);
        token = {};
      }
      return this;
    },
    withEnhancers(...input) {
      const newEnhancers = input.filter((x) => !enhancers.includes(x));
      if (newEnhancers.length) {
        enhancers = enhancers.concat(newEnhancers);
        token = {};
      }
      return this;
    },
    withSlice(inputSlice) {
      addSlice(inputSlice);
      return this;
    },
    withReducer(inputReducer: any) {
      if (!reducers.includes(inputReducer)) {
        reducers = reducers.concat(inputReducer);
        token = {};
      }
      return this;
    },
    withDevTools(input: any) {
      devTools = input;
      return this;
    },
    withPreloadedState(state) {
      if (preloadedState !== state) {
        preloadedState = state;
        token = {};
      }
      return this;
    },
    withListeners(...listeners) {
      listeners.forEach(addListener);
      return this;
    },
    withListener(when, effect) {
      addListener(createListener(when, effect));
      return this;
    },
  };

  return builder;
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
  let onError = createCallbackGroup();
  const listenerMiddleware = createListenerMiddleware({ onError });
  const builder = createStoreBuilder(
    (listener) => {
      if (store) {
        // use addListener action to start listeneing if the store is created
        store.dispatch(addListener(listener as any) as any);
      } else {
        listenerMiddleware.startListening(listener as any);
      }
    },
    ({
      preloadedState,
      reducerMap,
      reducers,
      middleware,
      preMiddleware,
      enhancers,
      devTools,
      readyHandlers,
      errorCallbacks,
    }) => {
      if (Object.keys(reducerMap).length) {
        reducers.push(combineReducers(reducerMap));
      }
      onError.add(...errorCallbacks);
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
          middleware: (getDefaultMiddleware) => [
            listenerMiddleware.middleware,
            ...preMiddleware,
            ...getDefaultMiddleware(),
            ...middleware,
          ],
        });
      }
      readyHandlers.forEach((handler) => handler(store));
    }
  );

  builder.build(buildCallback ?? ((builder) => builder), true);

  if (store) Object.assign(store, { builder });

  return store as Store<TState, TAction>;
};

const createLoadable = <T = any>(
  status: Loadable<T>["status"],
  data: T,
  error?: any
): InternalLoadable<T> => {
  return {
    data,
    error,
    status,
    loaded: status === "loaded",
    failed: status === "failed",
    idle: status === "idle",
    loading: status === "loading",
  };
};

const createDefer = <T = any>() => {
  let resolve: any;
  let reject: any;
  const promise = new Promise<T>((...args) => {
    [resolve, reject] = args;
  });
  promise.catch(() => {});
  return Object.assign(promise, {
    resolve: resolve as (value?: T) => any,
    reject: reject as (value?: any) => any,
  });
};

const getOriginal = <T>(value: T) => {
  if (isDraft(value)) return original(value);
  return value;
};

function onReady(this: any, handler: Function) {
  return {
    ...this,
    [onReadyCallbackSymbol]: (storeApi: any) => handler(storeApi, this),
  };
}

function onBuild(this: any, handler: Function) {
  return {
    ...this,
    [onBuildCallbackSymbol]: (builder: any) => handler(builder, this),
  };
}

export const createLoadableSlice: CreateLoadableSlice = (
  name: string,
  payloadCreator: any,
  options: LoadableOptions = {}
): any => {
  let lastAbort: Function | undefined;

  const initialLoadable = createLoadable("idle", options.initialState);
  // the dataSlice is for modifying loadable.data only
  const dataSlice =
    options.reducers || options.extraReducers
      ? createSliceOriginal({
          name,
          initialState: initialLoadable.data,
          reducers: options.reducers ?? {},
          extraReducers: options.extraReducers,
        })
      : undefined;
  const thunk = createAsyncThunk(
    `${name}/load`,
    (...args) => {
      const result = payloadCreator(...args);
      lastAbort = result?.abort;
      return result;
    },
    { ...options }
  );
  const clearError = createAction(`${name}/clearError`);

  const cancel = createAction(`${name}/cancel`, () => {
    lastAbort?.();
    return { payload: undefined };
  });
  const slice = createSlice(
    name,
    initialLoadable,
    {},
    {
      extraReducers: (builder) => {
        builder
          .addCase(thunk.pending, (state, action) => {
            const meta = { requestId: action.meta.requestId };
            // we store defer object in meta object, the defer object uses for handling suspense
            Object.defineProperty(meta, "extra", {
              value: {
                defer: createDefer(),
                abort: lastAbort,
              },
              // avoid redux's 'non-serialized value in store' warning
              enumerable: false,
              configurable: false,
            });
            return {
              ...createLoadable("loading", state.data),
              meta,
            };
          })
          .addCase(thunk.fulfilled, (state, action) => {
            const originalMeta = getOriginal(state.meta);
            if (originalMeta?.requestId !== action.meta.requestId) return state;
            originalMeta?.extra?.defer?.resolve(action.payload);
            return createLoadable("loaded", action.payload);
          })
          .addCase(thunk.rejected, (state, action) => {
            const originalMeta = getOriginal(state.meta);
            if (originalMeta?.requestId !== action.meta.requestId) return state;
            originalMeta?.extra?.defer?.reject(action.error);
            return createLoadable("failed", state.data, action.error);
          })
          // clear an error and set the loadable status to idle
          .addCase(clearError, (state) => {
            if (!state.failed) return state;
            return createLoadable("idle", state.data);
          })
          .addCase(cancel, (state) => {
            // do not perform cancellation if loadable is not loading
            if (!state.loading) return state;
            state.meta?.extra?.abort?.();
            return { ...createLoadable("idle", state.data), meta: {} };
          });
        if (dataSlice) {
          builder.addDefaultCase((state, action) => {
            // prevent user changes data while the slice is loading or it has an error
            if (state.loading || state.failed) return state;

            const prevData = getOriginal(state.data);
            const nextData = dataSlice.reducer(state.data, action);

            if (prevData !== nextData) {
              return createLoadable("loaded", nextData);
            }
            return state;
          });
        }
      },
    }
  );

  return Object.assign(slice, {
    onReady,
    selectData: createSliceSelector((state: any) => {
      const loadable = slice.select(state);
      if (loadable.failed) throw loadable.error;
      if (loadable.loading) throw loadable.meta?.extra?.defer as any;
      return loadable.data;
    }),
    actions: {
      // prepend actions for data
      ...dataSlice?.actions,
      load: thunk,
      loading: thunk.pending,
      loaded: thunk.fulfilled,
      failed: thunk.rejected,
      clearError,
      cancel,
    },
  });
};

export type WithBuilder = {
  /**
   * create a component wrapper that calls buildCallbacks
   */
  (buildCallback: DynamicBuildCallback): <C>(component: C) => C;

  /**
   * create a component wrapper that calls buildCallbacks
   */
  (buildCallbacks: DynamicBuildCallback[]): <C>(component: C) => C;

  /**
   * create a component wrapper that calls buildCallbacks
   */
  <C>(buildCallback: DynamicBuildCallback, component: C): C;

  /**
   * create a component wrapper that calls buildCallbacks
   */
  <C>(buildCallbacks: DynamicBuildCallback[], component: C): C;
};

const createWithBuilderWrapper = (
  component: any,
  buildCallback: DynamicBuildCallback | DynamicBuildCallback[]
) => {
  const buildCallbacks = Array.isArray(buildCallback)
    ? buildCallback
    : [buildCallback];

  const Wrapper = Object.assign(
    (props: any) => {
      useBuilder(...buildCallbacks);
      return createElement(component, props);
    },
    { displayName: component.displayName || component.name }
  );

  return memo(Wrapper);
};

/**
 * create a component wrapper that calls buildCallbacks
 * @param buildCallbacks
 * @param component
 * @returns
 */
export const withBuilder: WithBuilder = (
  buildCallbacks: DynamicBuildCallback | DynamicBuildCallback[],
  component?: any
): any => {
  if (component) return createWithBuilderWrapper(component, buildCallbacks);
  return (component: any) =>
    createWithBuilderWrapper(component, buildCallbacks);
};
