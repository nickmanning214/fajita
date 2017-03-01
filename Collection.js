/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
import Model from "./Model";

export default Backbone.Collection.extend({
    model:Model, //problem: Model relies on collection as well causing error
    initialize:function(){
         this.parentModels = [];
        //trigger "update" when submodel changes
        this.on("add",function(model){
            this.listenTo(model,"change",function(){
                this.trigger("update");
            })
        })
    }
});