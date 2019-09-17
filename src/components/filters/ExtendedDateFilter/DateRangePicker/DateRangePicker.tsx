// (C) 2007-2019 GoodData Corporation
import React from "react";
import cx from "classnames";
import moment from "moment";
import MomentLocaleUtils from "react-day-picker/moment";
import { DayPickerProps } from "react-day-picker";
import { injectIntl, InjectedIntlProps } from "react-intl";
import { DateRangePickerInputField } from "./DateRangePickerInputField";
import { mergeDayPickerProps, areRangeBoundsCrossed } from "./utils";
import { DateRangePickerError } from "./DateRangePickerError";
import { IExtendedDateFilterErrors } from "../../../../interfaces/ExtendedDateFilters";
import { sanitizeLocaleForMoment } from "../utils/dateFormattingUtils";
import { DateRangePickerInputFieldBody } from "./DateRangePickerInputFieldBody";
import "./DateRangePicker.scss";

export interface IDateRange {
    from: Date;
    to: Date;
}

interface IDateRangePickerProps {
    range: IDateRange;
    onRangeChange: (newRange: IDateRange) => void;
    errors?: IExtendedDateFilterErrors["absoluteForm"];
    dateFormat?: string | string[];
    dayPickerProps?: DayPickerProps;
    isMobile: boolean;
}

// converts Date to yyyy-mm-dd
const toInputDateString = (date: Date) => (date ? moment(date).format("YYYY-MM-DD") : "");

const toDateFromString = (dateString: string) => (dateString ? new Date(dateString) : undefined);

export class DateRangePickerComponent extends React.Component<IDateRangePickerProps & InjectedIntlProps> {
    private fromInputRef = (React as any).createRef();
    private toInputRef = (React as any).createRef();

    public render(): React.ReactNode {
        const {
            dateFormat,
            range: { from, to },
            dayPickerProps,
            intl,
            isMobile,
            errors: { from: errorFrom, to: errorTo } = { from: undefined, to: undefined },
        } = this.props;

        const defaultDayPickerProps: Partial<DayPickerProps> = {
            showOutsideDays: true,
            modifiers: { start: from, end: to },
            selectedDays: [from, { from, to }],
            locale: sanitizeLocaleForMoment(intl.locale),
            localeUtils: MomentLocaleUtils as any, // the typings are broken
        };

        const dayPickerPropsWithDefaults = mergeDayPickerProps(defaultDayPickerProps, dayPickerProps);

        const FromField = isMobile ? (
            <DateRangePickerInputFieldBody
                type="date"
                className={cx(
                    "s-date-range-picker-from",
                    "gd-date-range-picker-input",
                    "gd-date-range-picker-input-native",
                    errorFrom && "gd-date-range-picker-input-error",
                )}
                placeholder={intl.formatMessage({ id: "filters.from" })}
                // tslint:disable-next-line:jsx-no-lambda
                onChange={event => this.handleFromChange(toDateFromString(event.target.value))}
                value={toInputDateString(from)}
            />
        ) : (
            <DateRangePickerInputField
                className={cx("s-date-range-picker-from", errorFrom && "gd-date-range-picker-input-error")}
                classNameCalendar="s-date-range-calendar-from"
                ref={this.fromInputRef}
                onDayChange={this.handleFromChange}
                value={from || ""}
                format={dateFormat}
                placeholder={intl.formatMessage({ id: "filters.from" })}
                dayPickerProps={{
                    ...dayPickerPropsWithDefaults,
                    onDayClick: this.handleFromDayClick,
                }}
                // showOverlay={true} // Always shows the calendar, useful for CSS debugging
            />
        );

        const ToField = isMobile ? (
            <DateRangePickerInputFieldBody
                type="date"
                className={cx(
                    "s-date-range-picker-to",
                    "gd-date-range-picker-input",
                    "gd-date-range-picker-input-native",
                    errorTo && "gd-date-range-picker-input-error",
                )}
                placeholder={intl.formatMessage({ id: "filters.to" })}
                // tslint:disable-next-line:jsx-no-lambda
                onChange={event => this.handleToChange(toDateFromString(event.target.value))}
                value={toInputDateString(to)}
            />
        ) : (
            <DateRangePickerInputField
                className={cx("s-date-range-picker-to", errorTo && "gd-date-range-picker-input-error")}
                classNameCalendar="s-date-range-calendar-to"
                ref={this.toInputRef}
                onDayChange={this.handleToChange}
                value={to || ""}
                format={dateFormat}
                placeholder={intl.formatMessage({ id: "filters.to" })}
                dayPickerProps={{
                    ...dayPickerPropsWithDefaults,
                    onDayClick: this.handleToDayClick,
                }}
            />
        );

        return (
            <>
                <div className="gd-date-range-picker s-date-range-picker">
                    {FromField}
                    <span className="gd-date-range-picker-dash">&mdash;</span>
                    {ToField}
                </div>
                {(errorFrom || errorTo) && (
                    <DateRangePickerError
                        errorId={
                            // This means that when both inputs are invalid, error is shown only for "from"
                            errorFrom || errorTo
                        }
                    />
                )}
            </>
        );
    }

    private focusField = (inputRef: any) => {
        if (inputRef.current) {
            // Focus needs to happen on the next tick otherwise the day picker is not updated
            setTimeout(() => {
                inputRef.current.getInput().focus();
            }, 0);
        }
    };

    private blurField = (inputRef: any) => {
        if (inputRef.current) {
            inputRef.current.getInput().blur();
        }
    };

    private updateRange = (from: Date, to: Date) => {
        this.props.onRangeChange({ from, to });
    };

    private handleFromDayClick = () => {
        this.focusField(this.toInputRef);
    };

    private handleToDayClick = (to: Date) => {
        const rangeBoundsCrossed = areRangeBoundsCrossed(this.props.range.from, to);
        if (to && !rangeBoundsCrossed) {
            this.blurField(this.toInputRef);
        } else if (rangeBoundsCrossed) {
            this.focusField(this.fromInputRef);
        }
    };

    private handleFromChange = (from: Date) => {
        const to =
            from && this.props.range.to && areRangeBoundsCrossed(from, this.props.range.to)
                ? from
                : this.props.range.to;

        const inputValue = this.fromInputRef.current && this.fromInputRef.current.getInput().value;
        const sanitizedFrom = !from && !inputValue ? null : from;

        this.updateRange(sanitizedFrom, to);
    };

    private handleToChange = (to: Date) => {
        const from =
            to && this.props.range.from && areRangeBoundsCrossed(this.props.range.from, to)
                ? to
                : this.props.range.from;

        const inputValue = this.toInputRef.current && this.toInputRef.current.getInput().value;
        const sanitizedTo = !to && !inputValue ? null : to;

        this.updateRange(from, sanitizedTo);
    };
}
export const DateRangePicker = injectIntl(DateRangePickerComponent);