import Directive from "./directive";

export default Directive.extend({
    name:"abstractsubview",
    _initializeBackboneObject:function(){
        var args = this.val.split(":");
        this.subViewName = args[0];
         if (args[1]){
            this.subModelName = args[1];
            var model = this.view.get(this.subViewName); //changed from subModelName.
            if (model instanceof Backbone.Model) this.subModel = model;
            else if (model instanceof Backbone.Collection) this.subCollection = model;
            
            //console.log((model instanceof Backbone.Model),(model instanceof Backbone.Collection),this.subCollection)
            //debugger;
         }
    },



    _initializeChildViews:function(){

    }
})