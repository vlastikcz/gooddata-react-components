// (C) 2019 GoodData Corporation
import * as React from "react";
import Overlay from "@gooddata/goodstrap/lib/core/Overlay";
import { Separator } from "@gooddata/goodstrap/lib/List/MenuList";

import OperatorDropdownItem from "./OperatorDropdownItem";
import * as Operators from "../../../constants/measureValueFilterOperators";

export interface IOperatorDropdownBodyProps {
    selectedOperator: string;
    onSelect: (operator: string) => void;
    onClose: () => void;
    alignTo: string;
}

export default class OperatorDropdownBody extends React.PureComponent<IOperatorDropdownBodyProps> {
    public render() {
        const { onSelect, onClose, selectedOperator, alignTo } = this.props;

        return (
            <Overlay
                closeOnOutsideClick={true}
                alignTo={alignTo}
                alignPoints={[{ align: "bl tl" }]}
                onClose={onClose}
            >
                <div className="gd-dropdown overlay">
                    <div className="gd-mvf-operator-dropdown-body s-mvf-operator-dropdown-body">
                        <OperatorDropdownItem
                            operator={Operators.ALL}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <Separator />
                        <OperatorDropdownItem
                            operator={Operators.GREATER_THAN}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <OperatorDropdownItem
                            operator={Operators.GREATER_THAN_OR_EQUAL_TO}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <Separator />
                        <OperatorDropdownItem
                            operator={Operators.LESS_THAN}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <OperatorDropdownItem
                            operator={Operators.LESS_THAN_OR_EQUAL_TO}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <Separator />
                        <OperatorDropdownItem
                            operator={Operators.BETWEEN}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <OperatorDropdownItem
                            operator={Operators.NOT_BETWEEN}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <Separator />
                        <OperatorDropdownItem
                            operator={Operators.EQUAL_TO}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                        <OperatorDropdownItem
                            operator={Operators.NOT_EQUAL_TO}
                            selectedOperator={selectedOperator}
                            onClick={onSelect}
                        />
                    </div>
                </div>
            </Overlay>
        );
    }
}
