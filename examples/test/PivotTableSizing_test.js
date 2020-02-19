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

test("should trigger resize after attribute filter change", async t => {
    const firstCellSelector = ".s-cell-0-1";
    await checkCellValue(t, ".s-pivot-table-sizing-with-attribute-filter", "3,003,208", firstCellSelector);
    const originalWidth = await Selector(`.s-pivot-table-sizing-with-attribute-filter ${firstCellSelector}`)
        .clientWidth;
    const applyButton = Selector(".s-apply");
    await t
        .click(Selector(".s-attribute-filter .s-location_resort"))
        .click(Selector(".s-attribute-filter-list-item").nth(0))
        .click(applyButton);
    await checkCellValue(t, ".s-pivot-table-sizing-with-attribute-filter", "1,556,321", firstCellSelector);
    await t
        .expect(Selector(`.s-pivot-table-sizing-with-attribute-filter ${firstCellSelector}`).clientWidth)
        .eql(originalWidth);
});
