import * as React from 'react';
import { isEqual, cloneDeep, set, get, includes, omit } from 'lodash';
import { colors2Object, numberFormat } from '@gooddata/numberjs';
import sdk, { DataLayer } from '@gooddata/gooddata-js';

import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import * as icon from 'leaflet/dist/images/marker-icon.png';
import * as iconShadow from 'leaflet/dist/images/marker-shadow.png';

import 'leaflet.heat';
import 'leaflet.markercluster';

import { ErrorStates, ErrorCodes } from '../../../../constants/errorStates';
import { RuntimeError } from '../../../../errors/RuntimeError';

import * as HttpStatusCodes from 'http-status-codes';

function getJSONFromText(data: string) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

/** @augments {React.Component<any, any>} */
export class ExperimentalGeoChart extends React.Component {

 public origDf: string = null;
 public result: string = null;
 public props: any;
 public lastProperties: any;
 public geoData: any;
 public geoLayer: any;
 public lastProvider: string;
 public tiles: any;
 public currentLayer: any;
 public map: any;
 public canvas: any;
 public dataSource: any;
 public lastBounds: any;

 public transformFilters(afmFilters: any, dateDataSets: any) {
        const filters = afmFilters.map((item: any) => {

            if (item.positiveAttributeFilter) {
                return { constraint: { elements: item.positiveAttributeFilter.in, type: 'list' },
                         uri: item.positiveAttributeFilter.displayForm.uri
                       };
            }

            if (item.negativeAttributeFilter) {
                throw {
                        name: 'NegativeFilterError',
                        response: {
                            status: HttpStatusCodes.BAD_REQUEST,
                            json: () => Promise.resolve(null),
                            text: () => Promise.resolve(null)
                        }
                      };
            }

            if (item.relativeDateFilter) {

                const ds = dateDataSets.find((x: any) => item.relativeDateFilter.dataSet.uri === x.meta.uri);
                const attr = ds.availableDateAttributes.find((x: any) =>
                                 x.type === item.relativeDateFilter.granularity);

                return { constraint: { from: item.relativeDateFilter.from,
                                       to: item.relativeDateFilter.to,
                                       type: 'floating' },
                         uri: attr.defaultDisplayFormMeta.uri
                };

            }
            if (item.absoluteDateFilter) {
               const ds = dateDataSets.find((x: any) => item.absoluteDateFilter.dataSet.uri === x.meta.uri);
               const attr = ds.availableDateAttributes.find((x: any) => x.type === 'GDC.time.date');

               return { constraint: { from: item.absoluteDateFilter.from,
                                      to: item.absoluteDateFilter.to,
                                      type: 'interval' },
                        uri: attr.defaultDisplayFormMeta.uri
                };
            }

            return null;
        });

        return filters.filter((x: any) =>  x !== null);
    }

 public refreshData(props: any) {
            const { dataSource, resultSpec } = props;
            const geoChart = this;

            if (dataSource && (get(dataSource, 'afm.measures.length', 0) === 0)) {
               geoChart.onError({
                                name: 'NotFound',
                                response: {
                                    status: HttpStatusCodes.NOT_FOUND,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: '{"error": {"message":"Missing measure."}}'
                              });
            }

            if (dataSource && (get(dataSource, 'afm.attributes.length', 0) === 0)) {
               geoChart.onError({
                                name: 'InvalidBucketsError',
                                response: {
                                    status: HttpStatusCodes.BAD_REQUEST,
                                    json: () => Promise.resolve(null),
                                    text: () => Promise.resolve(null)
                                },
                                responseBody: '{"error": {"message":"Attribute is not geo pushpin."}}'
                              });
            }

            if (dataSource && (get(dataSource, 'afm.measures.length', 0) > 0) &&
                (get(dataSource, 'afm.attributes.length', 0) === 1)) {

               this.props.onLoadingChanged({ isLoading: true });

               sdk.md.getObjectDetails(dataSource.afm.attributes[0].displayForm.uri).then((obj) => {

                    if (obj.attributeDisplayForm.content.type &&
                        (obj.attributeDisplayForm.content.type === 'GDC.geo.pin')) {
                       geoChart.geoData = null;
                       geoChart.initDataLoading(dataSource, resultSpec);
                    } else {
                          sdk.md.getObjectDetails(obj.attributeDisplayForm.content.formOf).then((attrObj) => {

                           const displayForm = attrObj.attribute.content.displayForms.find(
                            (x: any) => (x.content.type && (x.content.type === 'GDC.geo.pin'))
                           );
                           if (displayForm) {
                              const dfUri = displayForm.meta.uri;

                              if (geoChart.origDf === null) {
                                geoChart.origDf = dataSource.afm.attributes[0].displayForm.uri;
                                geoChart.dataSource = dataSource;
                              }
                              dataSource.afm.attributes[0].displayForm.uri = dfUri;

                              geoChart.geoData = null;
                              geoChart.initDataLoading(dataSource, resultSpec);

                           } else {
                              const displayForm = attrObj.attribute.content.displayForms.find(
                               (x: any) => (x.content.type && (x.content.type.startsWith('GDC.geo.')))
                              );
                              const measureUri = get(dataSource.afm.measures[0], 'definition.measure.item.uri');
                              if (displayForm && measureUri) {
                                 const arr = geoChart.props.dataSource.afm.measures[0].definition.measure.item.
                                                      uri.match(/\/gdc\/md\/([^/]+)\//);
                                 const projectId = arr[1];

                                 sdk.catalogue.loadDateDataSets(projectId, {})
                                 .then((dateDataSets: any) => {

                                       const convertedFilters = geoChart.transformFilters(get(dataSource,
                                          'afm.filters', []), dateDataSets.dateDataSets);
                                       geoChart.geoLayer = displayForm.meta.uri;
                                       const geoRequest = {
                                          geoExecutionRequest: {
                                                   metric: measureUri,
                                                   layerDisplayForm: displayForm.meta.uri,
                                                   context: { filters: convertedFilters } } };
                                       geoChart.initGeoDataLoading(geoRequest);

                                 })
                                 .catch(geoChart.onError.bind(geoChart));

                              } else {

                                   geoChart.onError({
                                    name: 'InvalidBucketsError',
                                    response: {
                                        status: HttpStatusCodes.BAD_REQUEST,
                                        json: () => Promise.resolve(null),
                                        text: () => Promise.resolve(null)
                                    },
                                    responseBody: '{"error": {"message":"Attribute is not geo pushpin."}}'
                                  });

                              }
                           }

                       });
                    }

               }).catch((error) => {
                  this.onError(error);
               });
            } else {

              if (dataSource && (get(dataSource, 'afm.measures.length', 0) > 0) && (get(dataSource,
                  'afm.attributes.length', 0) === 2)) {
                geoChart.geoData = null;
                geoChart.initDataLoading(dataSource, resultSpec);
              } else {
                  this.setState({
                       isLoaded: true
                  });
                  this.props.onLoadingChanged({ isLoading: false });
              }
            }
   }

 public componentDidMount() {
            this.lastProperties = cloneDeep(omit(get(this.props,
              'visualizationProperties.properties.controls.geochart', {}), 'bounds'));
            this.refreshData(this.props);

   }

 public componentWillReceiveProps(nextProps: any) {

     if (!DataLayer.DataSourceUtils.dataSourcesMatch(this.props.dataSource, nextProps.dataSource)
                || !isEqual(this.props.resultSpec, nextProps.resultSpec)) {

           if  (this.props.visualizationProperties) {
             this.lastProperties = cloneDeep(omit(get(nextProps,
               'visualizationProperties.properties.controls.geochart', {}), 'bounds'));
             this.lastBounds = get(nextProps, 'visualizationProperties.properties.controls.geochart.bounds', null);
           }

           this.refreshData(nextProps);
      } else {
         if  (this.props.visualizationProperties) {
            const next = cloneDeep(omit(get(nextProps, 'visualizationProperties.properties.controls.geochart', {}),
               'bounds'));
            const nextBounds = get(nextProps, 'visualizationProperties.properties.controls.geochart.bounds', null);
            const autozoom = get(nextProps, 'visualizationProperties.properties.controls.geochart.autozoom', true);

            if (!isEqual(this.lastProperties, next) ||
            ((!isEqual(this.lastBounds, nextBounds)) && (!autozoom))) {

            this.lastProperties = next;

            this.lastBounds = nextBounds;

            if (this.result) {
               this.renderResult(this.result, nextProps);
            } else {
              this.refreshData(nextProps);
            }
         }
         }
      }
   }

 public initGeoDataLoading(geoRequest: any) {
       const _this = this;

       this.props.onLoadingChanged({ isLoading: true });
       const arr = this.props.dataSource.afm.measures[0].definition.measure.item.uri.match(/\/gdc\/md\/([^/]+)\//);
       const projectId = arr[1];

       sdk.xhr.post('/gdc/app/projects/' + projectId + '/execute', {
            body: JSON.stringify(geoRequest)
        })
            .then((r => r.getData()))
            .then((response) => {

              const geoResult = response.execResult.geoResult;

              const pollRequest = (iteration: number) => {

                sdk.xhr.get(geoResult, { dontPollOnResult: true })
                  .then(((r) => {
                    if ((r.response.status === 202) && (iteration > 0)) {
                      setTimeout(() => {pollRequest(iteration - 1); }, 1000);
                    } else {

                        if (r.response.status === 200) {
                          _this.geoData = r.getData();
                          _this.initDataLoading(_this.props.dataSource, _this.props.resultSpec);
                        } else {
                            _this.onError(r);
                        }
                    }
                }));
              };
              pollRequest(120);
        });
   }

 public initDataLoading(dataSource: any, resultSpec: any) {

       this.props.onLoadingChanged({ isLoading: true });

       dataSource.getData(resultSpec)
           .then(
               this.setDataResult.bind(this)
             )

           .catch(this.onError.bind(this));

       if (this.origDf !== null) {
          this.dataSource.afm.attributes[0].displayForm.uri = this.origDf;
          this.origDf = null;
       }
   }

 public setDataResult(result: any) {
    this.props.pushData({ result });
    this.renderResult(result, this.props);
   }

 public renderResult(result: any, props: any) {

       if ((result.executionResult === null) || ((result.executionResult.data.length === 0) &&
           (!result.executionResult.headerItems))) {
          throw {
            name: 'EmptyResultError',
            response: {
                status: HttpStatusCodes.NO_CONTENT,
                json: () => Promise.resolve(null),
                text: () => Promise.resolve(null)
            }
          };
       }

       this.result = result;

       if (result.executionResult) {
           const data = result.executionResult.data[0];

           const measures = result.executionResponse.dimensions[0].headers[0].measureGroupHeader.items;

           const formats = measures.map((item: any) => {
             return item.measureHeaderItem.format;
           });

           let categories = [];
           if (result.executionResult.headerItems[1].length === 1) {
             categories = result.executionResult.headerItems[1][0].map((item: any) => {
               return item.attributeHeaderItem.name;
             });
           }

           if (result.executionResult.headerItems[1].length === 2) {
             const len = result.executionResult.headerItems[1][0].length;

             for (let i = 0; i < len; i++) {
                categories.push(result.executionResult.headerItems[1][0][i].attributeHeaderItem.name + ';' +
                                result.executionResult.headerItems[1][1][i].attributeHeaderItem.name);
             }
           }

           this.createChart(data, categories, measures, formats, props);
       }
   }

 public createChart(data: any, categories: any, measures: any, formats: any, props: any) {

       function parseValue(value: any): number {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? null : parsedValue; // eslint-disable-line no-restricted-globals
       }

       props.onLoadingChanged({ isLoading: false });
       this.setState({
            isLoaded: true
        });
        
       const geotype: string = (this.geoData) ? 'polygon' :
          get(props, 'visualizationProperties.properties.controls.geochart.type', 'cluster');
       const provider: string = get(props, 'visualizationProperties.properties.controls.geochart.provider', 'MapBox');
       const color: string = get(props, 'visualizationProperties.properties.controls.geochart.color', 'blue');
       const autozoom: boolean = get(props, 'visualizationProperties.properties.controls.geochart.autozoom', true);
       const intensity: number = parseValue(get(props,
          'visualizationProperties.properties.controls.geochart.intensity', 1));
       const radius: number = parseValue(get(props,
          'visualizationProperties.properties.controls.geochart.radius', 25));

       const myIcon = (color === 'blue') ?
                       L.icon({
                          iconUrl: icon as any as string,
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                          shadowUrl: iconShadow as any as string,
                          shadowSize: [41, 41]
                       }) :
                       new L.Icon({
                          iconUrl:
                           'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' +
                             color + '.png',
                          shadowUrl:
                           'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                          shadowSize: [41, 41]
                       });

       if (!this.map) {
          this.map = L.map(this.canvas, { zoomControl: true, inertia: false, attributionControl: true,
                                          scrollWheelZoom: false, zoomAnimation: (geotype !== 'polygon') })
                                           .setView([28, 12], 2);
          this.map.attributionControl.setPrefix(false);
       } else {
          this.map.off('moveend');
       }

       if (!this.lastProvider || provider !== this.lastProvider) {
         this.lastProvider = provider;

         if (this.tiles) {
            this.map.removeLayer(this.tiles);
            this.tiles = null;
         }

         switch (provider) {

            case 'MapBox':
                 this.tiles = L.tileLayer('https://api.mapbox.com/v3/gooddata.map-0gbc185j/{z}/{x}/{y}.png', {
                   maxZoom: 19
                 });
                 break;

            case 'OpenStreetMap':
                 this.tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                   maxZoom: 19,
                   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                 });
                 break;

            case 'OpenTopoMap':
                 this.tiles = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                   maxZoom: 19,
                   attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>,' +
                      ' <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; ' +
                      '<a href="https://opentopomap.org">OpenTopoMap</a> ' +
                      '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                 });
                 break;

            case 'ESRI':
                  this.tiles =
                  L.tileLayer(
                   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                     attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC,' +
                     ' NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
                   });
                  break;

            case 'ESRIImagery':
                  this.tiles = L.tileLayer(
                   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                     attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, ' +
                       'Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    });
                  break;

            case 'CartoDB':
                   this.tiles = L.tileLayer(
                    'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png', {
                     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy;' +
                      ' <a href="http://cartodb.com/attributions">CartoDB</a>',
                     subdomains: 'abcd',
                     maxZoom: 19
                   });
                   break;

            case 'CartoDBDark':
                   this.tiles = L.tileLayer(
                    'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png', {
                     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
                      '&copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                     subdomains: 'abcd',
                     maxZoom: 19
                    });
                   break;

            case 'Wikimedia':

                     this.tiles = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {
                      attribution: '<a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>',
                      minZoom: 1,
                      maxZoom: 19
                     });

                     break;
         }
         this.map.addLayer(this.tiles);
       }

       if (this.map && this.currentLayer) {

         this.map.removeLayer(this.currentLayer);
         this.currentLayer = null;
       }

       let layer: any = (geotype === 'cluster') ?
         L.markerClusterGroup({ showCoverageOnHover: false, zoomToBoundsOnClick: true })
         :
         new L.LayerGroup();

       let bBox;

       let values: number[] = [];
       if (geotype !== 'polygon') {
         if (data) { values = data.map((item: string) => parseValue(item)); }
       } else {
         if (this.geoData.geoResult.data) { values = this.geoData.geoResult.data.map((item: any) =>
              parseValue(item.value)); }
       }

       const valMin = Math.min.apply(null, values);
       const valMax = Math.max.apply(null, values);
       const colorMin = [230, 230, 230];
       const colorMax = [20, 178, 226];
       const valDelta = valMax - valMin;

       const colors = values.map((value: number) => {
          const coef = (valDelta === 0) ? 1 : ((value - valMin) / valDelta);
          const r = Math.round(colorMin[0] + (colorMax[0] - colorMin[0]) * coef);
          const g = Math.round(colorMin[1] + (colorMax[1] - colorMin[1]) * coef);
          const b = Math.round(colorMin[2] + (colorMax[2] - colorMin[2]) * coef);
          return 'rgb(' + r + ',' + g + ',' + b + ')';
       });

       if (geotype !== 'polygon') {

           if (categories.length === data.length) {
           for (let i = 0; i < values.length; i++) {
              const pointStyle = { stroke: true, weight: 1, fillOpacity: 0.8, color: '#14b2e2', fillColor: colors[i] };
              const point = categories[i].split(';');
              const val = colors2Object(numberFormat(values[i], formats[0])).label;

              let drawable;
              switch (geotype) {
                case 'GD':
                        drawable = L.circleMarker(L.latLng(point[0], point[1]), pointStyle);
                        drawable.setRadius(4);
                        drawable.bindTooltip(
                         '<div style="font-size: 12px; margin:-7px; padding: 10px;' +
                         ' border-top: 3px solid rgb(20,178,226);">' +
                         measures[0].measureHeaderItem.name + ' ' + val + '</div>',
                        { direction: 'top', className: 'hc-tooltip' });
                        break;

                case 'basic':
                        drawable = L.marker(L.latLng(point[0], point[1]), { icon: myIcon });
                        drawable.bindTooltip('<div style="font-size: 12px; margin:-7px;' +
                        ' padding: 10px; border-top: 3px solid rgb(20,178,226);">' +
                         measures[0].measureHeaderItem.name + ' ' + val + '</div>',
                        { direction: 'auto', className: 'hc-tooltip' });
                        break;

                case 'heatmap':
                        pointStyle.fillColor = '#14b2e2';
                        drawable = L.circleMarker(L.latLng(point[0], point[1]), pointStyle);
                        drawable.setRadius(10);

                case 'cluster':
                        drawable = L.marker(L.latLng(point[0], point[1]), { icon: myIcon });
                        drawable.bindTooltip('<div style="font-size: 12px; margin:-7px; ' +
                        'padding: 10px; border-top: 3px solid rgb(20,178,226);">' +
                         measures[0].measureHeaderItem.name + ' ' + val + '</div>',
                        { direction: 'auto', className: 'hc-tooltip' });
                        break;
              }

              layer.addLayer(drawable);

              bBox = bBox ? bBox.extend(drawable.getLatLng().toBounds(10000))
                          : drawable.getLatLng().toBounds(10000);

            }
           }

           if (geotype === 'heatmap') {
                const points: any = [];
                let maxValue = Math.max(...values);
                maxValue = (maxValue === 0) ? 1 : maxValue;

                for (let i = 0; i < values.length; i++) {
                   const point = categories[i].split(';');
                   points.push([parseValue(point[0]), parseValue(point[1]), intensity * values[i] / maxValue]);
                }
                layer = L.heatLayer(points, { radius, blur: 20, minOpacity: 0.2 });
            }

           this.currentLayer = layer;
           layer.addTo(this.map);

        } else {

           if (values.length > 0) {
                const data = this.geoData.geoResult.data;

                for (let i = 0; i < values.length; i++) {
                    const { value, geometry, title, element } = data[i];

                    const polygonStyle = { stroke: true, weight: 1, fillOpacity: 0.8, color: '#14b2e2',
                                           fillColor: colors[i] };

                    const drawable = (L as any).geoJson({
                                               type: 'Feature',
                                               geometry,
                                               properties: {
                                                    description: title,
                                                    value,
                                                    element
                                                }
                                             }, {
                                               style: polygonStyle
                                             });
                    drawable.bindTooltip((layer: any) => {
                        const val = colors2Object(numberFormat(layer.feature.properties.value, formats[0])).label;
                        return '<div style="font-size: 12px; margin:-7px; padding: 10px; ' +
                        'border-top: 3px solid rgb(20,178,226);">' + layer.feature.properties.description + ' ' +
                         val + '</div>';
                    }, { direction: 'top', sticky: true, className: 'hc-tooltip' });

                    layer.addLayer(drawable);

                    bBox = bBox ? bBox.extend(drawable.getBounds()) : drawable.getBounds();

                }
                this.currentLayer = layer;
                layer.addTo(this.map);

           } else { bBox = null; }
        }

       if (autozoom) {
           if (bBox) {
             this.map.fitBounds(bBox, { padding: [10, 10] });
             this.map.invalidateSize(false);
           }
           this.lastBounds = null;
           if (props.visualizationProperties && props.visualizationProperties.properties &&
           props.visualizationProperties.properties.controls &&
            props.visualizationProperties.properties.controls.geochart &&
            props.visualizationProperties.properties.controls.geochart.bounds) {
               const newProperties = set(props, 'visualizationProperties.properties.controls.geochart.bounds', null);
               props.pushData({ properties: newProperties.visualizationProperties.properties });
           }

        } else {
           const nextBounds: any = get(props, 'visualizationProperties.properties.controls.geochart.bounds', null);

           if (nextBounds && nextBounds.length === 4) {
             const corner1 = L.latLng(nextBounds[0], nextBounds[1]);
             const corner2 = L.latLng(nextBounds[2], nextBounds[3]);
             const box = L.latLngBounds(corner1, corner2);
             this.lastBounds = [box.getSouth(), box.getWest(), box.getNorth(), box.getEast()];
             this.map.fitBounds(box, { padding: [0, 0] });

           } else {
             const box = this.map.getBounds();
             this.lastBounds = [box.getSouth(), box.getWest(), box.getNorth(), box.getEast()];
             const newProperties = set(props, 'visualizationProperties.properties.controls.geochart.bounds',
              this.lastBounds);
             props.pushData({ properties: newProperties.visualizationProperties.properties });
           }

           this.map.invalidateSize(false);

           this.map.on('moveend', function() {
            const box = this.map.getBounds();
            const bounds = [box.getSouth(), box.getWest(), box.getNorth(), box.getEast()];
            if (!isEqual(this.lastBounds, bounds)) {
               this.lastBounds = bounds;

               const newProperties = set(this.props, 'visualizationProperties.properties.controls.geochart.bounds',
                bounds);
               this.props.pushData({ properties: newProperties.visualizationProperties.properties });
            }
           }, this);

        }


   }

 public render() {

          return (
           <div
                style={{ width: '100%', height: ((this.props.environment === 'dashboards') ? '300px' : '100%'), zIndex: 1 }}
                ref={ref => this.canvas = ref}
           />

          );
   }

 public onError(error: any) {
       console.log('error');
       console.log(error);
       if (this.map)
       { 
          this.map.remove();
          this.map = null;
          this.lastProvider = null;
          this.currentLayer = null;
          this.lastBounds = null;
          this.canvas.classList.remove("leaflet-container");
          
       }

       let status;       
       if (error.response && error.response.status) {
          const errorCode = error.response.status;

          switch (errorCode) {
            case HttpStatusCodes.NO_CONTENT:
                status = new RuntimeError(ErrorStates.NO_DATA, error);
                break;
            case HttpStatusCodes.REQUEST_TOO_LONG:
                status =  new RuntimeError(ErrorStates.DATA_TOO_LARGE_TO_COMPUTE, error);
                break;

            case HttpStatusCodes.BAD_REQUEST:
                const message = get(getJSONFromText(error.responseBody), 'error.message', '');

                status = (includes(message, 'Attempt to execute protected report unsafely')) ?
                    new RuntimeError(ErrorStates.PROTECTED_REPORT, error)
                    :
                    new RuntimeError(ErrorStates.BAD_REQUEST, error)
                    ;

                break;

            case HttpStatusCodes.NOT_FOUND:
                status =  new RuntimeError(ErrorStates.NOT_FOUND, error);
                break;

            case HttpStatusCodes.UNAUTHORIZED:
                status =  new RuntimeError(ErrorStates.UNAUTHORIZED, error);
                break;

            case ErrorCodes.EMPTY_AFM:
                status =  new RuntimeError(ErrorStates.EMPTY_AFM);
                break;

            case ErrorCodes.INVALID_BUCKETS:
                status =  new RuntimeError(ErrorStates.INVALID_BUCKETS);
                break;

            default:
                status =  new RuntimeError(ErrorStates.UNKNOWN_ERROR);
                break;

          }
        } else {
           status =  new RuntimeError(ErrorStates.UNKNOWN_ERROR);
        }

       this.props.onLoadingChanged({ isLoading: false });
       this.props.onError(status);
   }

}
