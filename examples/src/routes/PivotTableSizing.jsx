// (C) 2007-2020 GoodData Corporation
import React from "react";

import ExampleWithSource from "../components/utils/ExampleWithSource";
import PivotTableSizingExample from "../components/PivotTableSizingExample";
import PivotTableSizingExampleSRC from "!raw-loader!../components/PivotTableSizingExample"; // eslint-disable-line import/no-webpack-loader-syntax, import/no-unresolved, import/extensions, import/first

export const PivotTableSizing = () => (
    <div>
        <h1>Pivot Table Sizing</h1>

        <hr className="separator" />

        <h2 id="measures-row-attributes-and-column-attributes">Table with subtotals</h2>
        <ExampleWithSource
            for={() => (
                <PivotTableSizingExample
                    withAttributes
                    withMeasures
                    withPivot
                    className="s-measures-row-attributes-and-column-attributes"
                />
            )}
            source={PivotTableSizingExampleSRC}
        />
    </div>
);

export default PivotTableSizing;
