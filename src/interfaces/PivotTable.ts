// (C) 2007-2020 GoodData Corporation
import { ISeparators } from "@gooddata/numberjs";
import { AFM } from "@gooddata/typings";

export interface IMenu {
    aggregations?: boolean;
    aggregationsSubMenu?: boolean;
}

export interface IColumnSizing {
    defaultWidth: "viewport"; // "viewport" | "auto" | "unset" | number; see ONE-4276
}

export interface IPivotTableConfig {
    columnSizing?: IColumnSizing;
    separators?: ISeparators;
    menu?: IMenu;
    maxHeight?: number;
}

export interface IMenuAggregationClickConfig {
    type: AFM.TotalType;
    measureIdentifiers: string[];
    attributeIdentifier: string;
    include: boolean;
}
