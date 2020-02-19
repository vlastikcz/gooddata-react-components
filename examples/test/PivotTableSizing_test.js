// (C) 2007-2020 GoodData Corporation
import { Selector } from "testcafe";
import { config } from "./utils/config";
import { checkCellValue, loginUsingLoginForm } from "./utils/helpers";

fixture("Pivot Table Sizing")
    .page(config.url)
    .beforeEach(loginUsingLoginForm(`${config.url}/hidden/pivot-table-sizing`));

test("should render all tables", async t => {
    const firstCellSelector = ".s-cell-0-0";
    await checkCellValue(t, ".s-pivot-table-sizing", "Aaron Clements", firstCellSelector);
    await checkCellValue(t, ".s-pivot-table-sizing-with-subtotals", "Alabama", firstCellSelector);
    await checkCellValue(t, ".s-pivot-table-sizing-with-attribute-filter", "2015", firstCellSelector);
});

async function applyAttributeFilter(t, tableWrapper) {
    const secondCell = ".s-cell-0-2";
    const wrapper = Selector(tableWrapper);
    await checkCellValue(t, tableWrapper, "1,556,321", secondCell);
    await t
        .click(wrapper.find(".s-location_resort"))
        .click(Selector(".s-attribute-filter-list-item").nth(1))
        .click(Selector(".s-apply"));
    await checkCellValue(t, tableWrapper, "3,185,736", secondCell);
}

test("should trigger resize after attribute filter change", async t => {
    const tableWrapper = ".s-pivot-table-sizing-with-attribute-filter";
    const firstCellSelector = ".s-cell-0-1";
    const originalWidth = await Selector(tableWrapper).find(firstCellSelector).clientWidth;

    await applyAttributeFilter(t, tableWrapper);
    await t.expect(Selector(tableWrapper).find(firstCellSelector).clientWidth).eql(originalWidth);
});
