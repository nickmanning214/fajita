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
    _initializeChildMappings:function(){
        //The JSON object to pass as "templateValues" to the subview or the item in the subCollection.
         //Do not shorten to view.get. view.get gets from the viewModel which contains props and values...not view props and app props
        this.childMappings = this.view.templateValues && this.view.templateValues[this.subViewName];
    },
    _initializedefaultsOverride:function(){
        //Not shortened to view.get because I'm not sure if it is useful to do so.
        //view.get gets the app value mapped to the default value, and if not then it gets the default value.
        //I think you're just overriding defaults with defaults, and nothing fancier than that.
        //this.defaultsOverride = this.view.defaults && this.view.defaults[this.subViewName];
        //Nevermind it is useful to use .get because if there are nested nested views, you can't just go to the defaults of that view. They might be overridden.

        this.defaultsOverride = this.view.get(this.subViewName);
    },



    _initializeChildViews:function(){

    }
})