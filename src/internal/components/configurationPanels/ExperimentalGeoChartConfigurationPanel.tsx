import * as React from 'react';
import get = require('lodash/get');
import DropdownControl from '../configurationControls/DropdownControl';
import CheckboxControl from '../configurationControls/CheckboxControl';
import InputControl from '../configurationControls/InputControl';

import ConfigurationPanelContent from './ConfigurationPanelContent';
import ConfigSection from '../configurationControls/ConfigSection';

import { IDropdownItem } from '../../components/configurationControls/DropdownControl';

import { getTranslatedDropdownItems } from '../../utils/translations';

import { createInternalIntl } from "../../utils/internalIntlProvider";
import { DEFAULT_LOCALE } from "../../../constants/localization";


export default class ExperimentalGeoChartConfigurationPanel extends ConfigurationPanelContent {
    protected renderConfigurationPanel() {
        const { propertiesMeta, properties } = this.props;
        const geoChartType = get(this.props, 'properties.controls.geochart.type', 'cluster');
        const geoProvider = get(this.props, 'properties.controls.geochart.provider', 'MapBox');
        const geoColor = get(this.props, 'properties.controls.geochart.color', 'blue');
        const autoZoomEnabled = get(this.props, 'properties.controls.geochart.autozoom', true);
        const geoIntensity = get(this.props, 'properties.controls.geochart.intensity', 1);
        const geoRadius = get(this.props, 'properties.controls.geochart.radius', 25);
 
       const intl = createInternalIntl(DEFAULT_LOCALE);

        const chartTypeDropdownItems: IDropdownItem[] = [
            { title: 'properties.geochart.type.basic', value: 'basic' },
            { title: 'properties.geochart.type.cluster', value: 'cluster' },
            { title: 'properties.geochart.type.heatmap', value: 'heatmap' }
        ];

        const chartProviderDropdownItems: IDropdownItem[] = [
            { title: 'properties.geochart.provider.mapbox', value: 'MapBox' },
            { title: 'properties.geochart.provider.OpenStreetMap', value: 'OpenStreetMap' },
            { title: 'properties.geochart.provider.OpenTopoMap', value: 'OpenTopoMap' },
            { title: 'properties.geochart.provider.ESRI', value: 'ESRI' },
            { title: 'properties.geochart.provider.ESRIImagery', value: 'ESRIImagery' },
            { title: 'properties.geochart.provider.CartoDB', value: 'CartoDB' },
            { title: 'properties.geochart.provider.CartoDBDark', value: 'CartoDBDark' },
            { title: 'properties.geochart.provider.Wikimedia', value: 'Wikimedia' }
        ];

        const chartColorDropdownItems: IDropdownItem[] = [
            { title: 'properties.geochart.color.blue', value: 'blue' },
            { title: 'properties.geochart.color.green', value: 'green' },
            { title: 'properties.geochart.color.red', value: 'red' },
            { title: 'properties.geochart.color.orange', value: 'orange' },
            { title: 'properties.geochart.color.magenta', value: 'violet' },
            { title: 'properties.geochart.color.yellow', value: 'yellow' }
        ];

        const mapSection = (
                             <ConfigSection
                                id="geochart_section"
                                title="properties.geochart.title"
                                propertiesMeta={propertiesMeta}
                                properties={properties}
                                pushData={this.props.pushData}
                             >

                                <DropdownControl
                                    value={geoProvider}
                                    valuePath="geochart.provider"
                                    labelText="properties.geochart.provider"
                                    disabled={false}
                                    properties={properties}
                                    pushData={this.props.pushData}
                                    items={getTranslatedDropdownItems(chartProviderDropdownItems, intl)}
                                    showDisabledMessage={false}
                                />

                                <DropdownControl
                                    value={geoChartType}
                                    valuePath="geochart.type"
                                    labelText="properties.geochart.type"
                                    disabled={false}
                                    properties={properties}
                                    pushData={this.props.pushData}
                                    items={getTranslatedDropdownItems(chartTypeDropdownItems, intl)}
                                    showDisabledMessage={false}
                                />

                                <CheckboxControl
                                    valuePath="geochart.autozoom"
                                    labelText="properties.geochart.autozoom"
                                    properties={properties}
                                    checked={autoZoomEnabled}
                                    disabled={false}
                                    pushData={this.props.pushData}
                                />

                             </ConfigSection>);

        const markerSection = (
                                <ConfigSection
                                    id="marker_section"
                                    title="properties.geochart.marker"
                                    propertiesMeta={propertiesMeta}
                                    properties={properties}
                                    pushData={this.props.pushData}
                                >

                                    <DropdownControl
                                        value={geoColor}
                                        valuePath="geochart.color"
                                        labelText="properties.geochart.color"
                                        disabled={false}
                                        properties={properties}
                                        pushData={this.props.pushData}
                                        items={getTranslatedDropdownItems(chartColorDropdownItems, intl)}
                                        showDisabledMessage={false}
                                    />

                                </ConfigSection>);

        const heatmapSection = (
                                <ConfigSection
                                    id="heatmap_section"
                                    title="properties.geochart.heatmap"
                                    propertiesMeta={propertiesMeta}
                                    properties={properties}
                                    pushData={this.props.pushData}
                                >

                                    <InputControl
                                        valuePath="geochart.intensity"
                                        labelText="properties.geochart.intensity"
                                        placeholder="properties.auto_placeholder"
                                        type="number"
                                        value={geoIntensity}
                                        disabled={false}
                                        properties={properties}
                                        pushData={this.props.pushData}
                                        hasWarning={false}
                                    />

                                    <InputControl
                                        valuePath="geochart.radius"
                                        labelText="properties.geochart.radius"
                                        placeholder="properties.auto_placeholder"
                                        type="number"
                                        value={geoRadius}
                                        disabled={false}
                                        properties={properties}
                                        pushData={this.props.pushData}
                                        hasWarning={false}
                                    />

                                </ConfigSection>);

        if (geoChartType !== 'heatmap') {

          return (

                <div>
                  {mapSection}
                  {markerSection}
                </div>
        );
       } else {
       return (

                <div>
                  {mapSection}
                  {heatmapSection}
                </div>
        );
       }

    }

}
