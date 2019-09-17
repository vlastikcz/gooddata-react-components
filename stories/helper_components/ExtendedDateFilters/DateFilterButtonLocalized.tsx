// (C) 2007-2019 GoodData Corporation
import React from "react";
import { storiesOf } from "@storybook/react";
import { ExtendedDateFilters } from "@gooddata/typings";
import { IntlDecorator } from "../../utils/IntlDecorators";
import { DateFilterButtonLocalized } from "../../../src/components/filters/ExtendedDateFilter/DateFilterButtonLocalized/DateFilterButtonLocalized";

const granularities: ExtendedDateFilters.DateFilterGranularity[] = [
    "GDC.time.date",
    "GDC.time.week_us",
    "GDC.time.month",
    "GDC.time.quarter",
    "GDC.time.year",
];

interface IRelativeFormButtonProps {
    from: number;
    to: number;
    selectedGranularity: ExtendedDateFilters.DateFilterGranularity;
}

const RelativeFormButton = ({ from, to, selectedGranularity }: IRelativeFormButtonProps) => {
    return IntlDecorator(
        <DateFilterButtonLocalized
            dateFilterOption={{
                localIdentifier: "RELATIVE_FORM",
                from,
                to,
                granularity: selectedGranularity, // TODO ONE-4000 This was previously `selectedGranulatity` property name, but interface does not know such option. Maybe mistake? I Changed it to `granularality` property name
                type: "relativeForm",
                availableGranularities: granularities,
                visible: true,
                name: "Floating range",
            }}
            isMobile={false}
        />,
    );
};

interface IRelativePresetButtonProps {
    from: number;
    to: number;
    granularity: ExtendedDateFilters.DateFilterGranularity;
    name?: string;
    excludeCurrentPeriod?: boolean;
}

const RelativePresetButton = ({
    from,
    to,
    granularity,
    name,
    excludeCurrentPeriod = false,
}: IRelativePresetButtonProps) =>
    IntlDecorator(
        <DateFilterButtonLocalized
            dateFilterOption={{
                localIdentifier: "relativePreset",
                type: "relativePreset",
                name,
                granularity,
                from,
                to,
                visible: true,
            }}
            excludeCurrentPeriod={excludeCurrentPeriod}
            isMobile={false}
        />,
    );

interface IAbsolutePresetButtonProps {
    from: ExtendedDateFilters.DateString;
    to: ExtendedDateFilters.DateString;
    name?: string;
}

const AbsolutePresetButton = ({ from, to, name }: IAbsolutePresetButtonProps) => {
    return IntlDecorator(
        <DateFilterButtonLocalized
            dateFilterOption={{
                localIdentifier: "ABSOLUTE_PRESET",
                type: "absolutePreset",
                // granularity: "GDC.time.date", // TODO ONE-4000 This was previously in the object, but interface does not know such property. Commented out.
                name,
                from,
                to,
                visible: true,
            }}
            isMobile={false}
        />,
    );
};

storiesOf("ExtendedDateFilters/DateFilterButtonLocalized", module)
    .add("allTime", () =>
        IntlDecorator(
            <DateFilterButtonLocalized
                dateFilterOption={{
                    localIdentifier: "ALL_TIME",
                    type: "allTime",
                    name: "All time",
                    visible: true,
                }}
                isMobile={false}
            />,
        ),
    )

    .add("absoluteForm", () => (
        <>
            {IntlDecorator(
                <DateFilterButtonLocalized
                    dateFilterOption={{
                        from: new Date(Date.UTC(2018, 4, 1)).toISOString(),
                        to: new Date(Date.UTC(2019, 3, 30)).toISOString(),
                        localIdentifier: "ABSOLUTE_FORM",
                        type: "absoluteForm",
                        name: "Static period",
                        visible: true,
                    }}
                    isMobile={false}
                />,
            )}
            {IntlDecorator(
                <DateFilterButtonLocalized
                    dateFilterOption={{
                        from: new Date(Date.UTC(2018, 4, 1)).toISOString(),
                        to: new Date(Date.UTC(2018, 4, 1)).toISOString(),
                        localIdentifier: "ABSOLUTE_FORM",
                        type: "absoluteForm",
                        name: "Static period",
                        visible: true,
                    }}
                    isMobile={false}
                />,
            )}
        </>
    ))

    .add("relativeForm", () => {
        type FromTo = [number, number];
        const fromToPairs: FromTo[] = [
            [0, 0],
            [1, 1],
            [-1, -1],

            [0, 9],
            [-9, 0],

            [1, 10],
            [5, 10],
            [-10, -1],
            [-10, -5],
            [-1, 1],
            [-10, 1],
            [-1, 10],
            [-10, 10],
        ];

        return fromToPairs.map(([from, to], index) => (
            <React.Fragment key={`${from}-${to}`}>
                {index > 0 ? <hr /> : null}
                {granularities.map(g => (
                    <RelativeFormButton key={g} from={from} to={to} selectedGranularity={g} />
                ))}
            </React.Fragment>
        ));
    })

    .add("absolutePreset", () => (
        <>
            <AbsolutePresetButton
                from={new Date(Date.UTC(2018, 11, 20)).toISOString()}
                to={new Date(Date.UTC(2018, 11, 30)).toISOString()}
                name="Filter name when name is specified"
            />

            <AbsolutePresetButton
                from={new Date(Date.UTC(2018, 11, 20)).toISOString()}
                to={new Date(Date.UTC(2018, 11, 30)).toISOString()}
            />
        </>
    ))

    .add("relativePreset", () => (
        <>
            <RelativePresetButton
                from={-6}
                to={0}
                granularity="GDC.time.date"
                name="Filter name when name is specified"
            />

            <RelativePresetButton from={-6} to={0} granularity="GDC.time.date" />
        </>
    ))

    .add("relativePreset with exclude", () => (
        <>
            <RelativePresetButton from={-6} to={-1} granularity="GDC.time.date" excludeCurrentPeriod={true} />
            <RelativePresetButton
                from={-6}
                to={-1}
                granularity="GDC.time.date"
                excludeCurrentPeriod={false}
            />
        </>
    ));