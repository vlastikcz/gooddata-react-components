import * as React from 'react';
import { get, set, isEqual } from 'lodash';
import { ErrorStates, ErrorCodes } from '@gooddata/react-components';
import { colors2Object,numberFormat } from '@gooddata/numberjs';


import { AfmUtils } from '@gooddata/data-layer';

var EmbedApi = require('./embedapi.js');

function getJSONFromText(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}


/** @augments {React.Component<any, any>} */
export class CustomChart extends React.Component {

 componentDidMount() {
        const { dataSource, resultSpec } = this.props;   
        
       /*    
       fetch("https://www.goodmeeting.cz/svg/custom.svg")
       .then(res => res.text())
       .then(
        (result) => {         
          */
          var result=get(this.props.visualizationProperties,'properties.controls.custom.svg','');
          this.svgCanvas=null;
          this.oldSvg='';
           
          this.setState({
            isLoaded: true,
            svgText: result
          });
                 
          
        const { dataSource, resultSpec } = this.props;
        
        if (dataSource && dataSource.afm && dataSource.afm.measures && dataSource.afm.measures.length>0)
        {
          this.initDataLoading(dataSource, resultSpec)
        }
        else
        {
          this.svg=result;
          this.setState({
               isLoaded: true,
               svgText: result              
          });
          this.props.onLoadingChanged({ isLoading: false });         
        }  
       /*
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
          this.props.onLoadingChanged({ isLoading: false });
          
        }
      )
       */
       
   }

  componentWillReceiveProps(nextProps) {
    
        var _this=this;
        
        function handleSvgData(data, error) {
                    if (error) {
                        console.log('error handleSvgData: ' + error);
                    } else {
                        
                        _this.svgCanvas=null;
                        const newProperties = set(_this.props.visualizationProperties, 'properties.controls.custom.svg', data);
                        _this.props.pushData({ properties: newProperties.properties });
                        _this.setState({
                            svgText: data
                        });
                        if (_this.result)
                          _this.setDataResult(_this.result);
                    }
        };
 
            
     
      if ( !isEqual(this.props.dataSource, nextProps.dataSource) ) {
           const { dataSource, resultSpec } = nextProps;
           
           if (dataSource.afm.measures.length>0)
           {
             this.initDataLoading(dataSource, resultSpec)
           }
           else
           {
             this.svg=this.state.svgText;
             this.setState({
                  isLoaded: true
             });
             this.props.onLoadingChanged({ isLoading: false }); 
           }
           return;
       }
       
       var newMode = get(nextProps.visualizationProperties,'properties.controls.custom.editmode',true);
       if ( (this.svgCanvas) && (newMode==false) )
       {
          console.log('get svg');         
          this.svgCanvas.getSvgString()(handleSvgData);
       }
       
   }


   initDataLoading(dataSource, resultSpec) {
       this.props.onLoadingChanged({ isLoading: true });
       dataSource.getData(resultSpec)
           .then(this.setDataResult.bind(this))
           .catch(this.onError.bind(this));
   }


   setDataResult(result) {

       this.props.pushData({ result });
       this.result=result;
       if (result.executionResult) {
           const data = result.executionResult.data[0];
           const measures = result.executionResponse.dimensions[1].headers[0].measureGroupHeader.items;    
           const formats=measures.map((item) => {
             return item.measureHeaderItem.format;
           } );
           this.createChart(data, formats);
       }
   }


   createChart(data, formats) {      
       var svg=''+this.state.svgText;
       
       var oldSvg = get(this.props.visualizationProperties, 'properties.controls.custom.svg', '');

       if (!isEqual( oldSvg, svg ) )
       {
           console.log('new svg');
           console.log(oldSvg);
           console.log(svg);
           const newProperties = set(this.props.visualizationProperties, 'properties.controls.custom.svg', svg);
             this.props.pushData({ properties: newProperties.properties }); 
           
          
       }

       for(var i=0;i<data.length;i++)
       {
         const val=colors2Object(numberFormat(data[i],formats[i])).label;
         svg=svg.replace(new RegExp('{metric'+((i+1).toString())+'}', 'g'),val);
       }
       this.svg=svg;
       this.setState({
            isLoaded: true
          });
          
       this.props.onLoadingChanged({ isLoading: false });
        
       
   }   

   render() {  
       if (this.state && this.state.error) {
          return <div>Error: {error.message}</div>;
        } else if (!this.state || !this.state.isLoaded) {
          return <div>Loading...</div>;
        } else {
        
          var html='';
          if (get(this.props.visualizationProperties,'properties.controls.custom.editmode',false) || this.svgCanvas)
          {
            const svgorig=this.state.svgText;
         
            const _this=this;
            
            window.initEmbed = function () {
        
                console.log('Init Embed invoked');
                
                if (!_this.svgCanvas)
                {
                   _this.svgCanvas = new window.EmbeddedSVGEdit(window.frames.svgedit,'*');   
                
                   _this.svgCanvas.setSvgString(svgorig); 
                
                   //svgCanvas.setSvgString('<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><g class="layer"><title>Layer 1</title>  <rect id="svg_1" height="16" width="79" y="44.5" x="10.5" stroke-width="5" stroke="#000000" fill="#FF0000"/> </g></svg>');
                   setTimeout(function(){
                   _this.svgCanvas.setSvgString(svgorig); 
                   },250);
                   
                   setTimeout(function(){
                   _this.svgCanvas.setSvgString(svgorig); 
                   },500);
                }                             
                
            };
            html = '<iframe src="https://www.goodmeeting.cz/svgedit/svg-editor.html?extensions=ext-xdomain-messaging.js" width="100%" height="480px" id="svgedit" onload="initEmbed();"></iframe>';
 
          }
          else
          { 
                                    
            html=this.svg;
          }
          return (
            <div id="svgcontainer" className="content" dangerouslySetInnerHTML={{__html: html}}></div>                   
          );
        }     
   }
   
   
   onError(error) {
       console.log('onError');
       console.log(error);
       
       if (error.response && error.response.status)
       {
       const errorCode = error.response.status;
       let status;

      switch (errorCode) {
        case HttpStatusCodes.NO_CONTENT:
            status = new RuntimeError(ErrorStates.NO_DATA, error);
            break;
        case HttpStatusCodes.REQUEST_TOO_LONG:
            status =  new RuntimeError(ErrorStates.DATA_TOO_LARGE_TO_COMPUTE, error);
            break;

        case HttpStatusCodes.BAD_REQUEST:
            const message = get(getJSONFromText(error.responseBody), 'error.message', '');

            if (includes(message, 'Attempt to execute protected report unsafely')) {
                status =  new RuntimeError(ErrorStates.PROTECTED_REPORT, error);
            } else {
                status =  new RuntimeError(ErrorStates.BAD_REQUEST, error);
            }
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

       this.props.onError( status );
       this.props.onLoadingChanged({ isLoading: false });
   } 
   }
}
