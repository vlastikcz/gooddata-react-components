import * as React from 'react';
import get = require('lodash/get');
import CheckboxControl from '../configurationControls/CheckboxControl';

import ConfigurationPanelContent from './ConfigurationPanelContent';
import ConfigSection from '../configurationControls/ConfigSection';

export default class ExperimentalGeoChartConfigurationPanel extends ConfigurationPanelContent {
    protected renderConfigurationPanel() {
        const { propertiesMeta, properties } = this.props;
        const editMode = get(this.props, 'properties.controls.custom.editmode', false);

        const editModeSection = (
                    <ConfigSection
                        id="customchart_section"
                        title="properties.custom.title"
                        propertiesMeta={propertiesMeta}
                        properties={properties}
                        pushData={this.props.pushData}
                    >

                        <CheckboxControl
                            valuePath="custom.editmode"
                            labelText="properties.custom.editmode"
                            properties={properties}
                            checked={editMode}
                            disabled={false}
                            pushData={this.props.pushData}
                        />

                    </ConfigSection>
        );

        return (
                <div>
                  {editModeSection}
                </div>
        );

    }
}
