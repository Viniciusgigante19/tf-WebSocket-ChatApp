import { ListApi, ProductModel } from "@app/js/app.types";

export type ProductsProviderProps = {
    children: React.ReactNode
}

export type ProductsContextValues = {
    state: ProductsState
    changeData: (data?: ListApi<ProductModel> | "error") => void;
}

export type ProductsState = {
    data?: ListApi<ProductModel> | "error";
}

type ChangeProductsAction = {
    type: "changeProducts";
    payload?: ListApi<ProductModel> | "error";
}


export type ProductsActions = ChangeProductsAction;