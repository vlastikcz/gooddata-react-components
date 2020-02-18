// (C) 2007-2020 GoodData Corporation
import React from "react";

import ExampleWithSource from "../components/utils/ExampleWithSource";
import PivotTableSizingWithSubtotalsExample from "../components/PivotTableSizingWithSubtotalsExample";
import PivotTableSizingWithSubtotalsExampleSRC from "!raw-loader!../components/PivotTableSizingWithSubtotalsExample"; // eslint-disable-line import/no-webpack-loader-syntax, import/no-unresolved, import/extensions, import/first
import PivotTableSizingWithAttributeFilterExample from "../components/PivotTableSizingWithAttributeFilterExample";
import PivotTableSizingWithAttributeFilterExampleSRC from "!raw-loader!../components/PivotTableSizingWithAttributeFilterExample"; // eslint-disable-line import/no-webpack-loader-syntax, import/no-unresolved, import/extensions, import/first

export const PivotTableSizing = () => (
    <div>
        <h1>Pivot Table Sizing</h1>

        <hr className="separator" />

        <h2 id="measures-row-attributes-and-column-attributes">Table with subtotals</h2>
        <ExampleWithSource
            for={() => (
                <PivotTableSizingWithSubtotalsExample
                    withAttributes
                    withMeasures
                    withPivot
                    className="s-measures-row-attributes-and-column-attributes"
                />
            )}
            source={PivotTableSizingWithSubtotalsExampleSRC}
        />

        <hr className="separator" />

        <h2 id="measures-row-attributes-and-column-attributes">Table with attribute filter</h2>
        <ExampleWithSource
            for={() => (
                <PivotTableSizingWithAttributeFilterExample
                    withAttributes
                    withMeasures
                    withPivot
                    className="s-measures-row-attributes-and-column-attributes"
                />
            )}
            source={PivotTableSizingWithAttributeFilterExampleSRC}
        />
    </div>
);

export default PivotTableSizing;
