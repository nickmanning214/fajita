/*import Backbone from "backbone";*/

export default Backbone.View.extend({
    name:null,
    build:null,
    render:null,
    initialize:function(options){
        if (!this.name) console.error("Error: Directive requires a name in the prototype.");
        this.val = options.val;
        
        
        //view is the view that implements this directive.
        if (!options.view) console.error("Error: Directive requires a view passed as an option.");
        this.view = options.view;
        if (!this.childInit) console.error("Error: Directive requires childInit in prototype.");
        this.childInit();
        this.build();
    },
    childInit:function(){
       
        this.updateResult();
        this.listenTo(this.view.viewModel,"change:"+this.val,function(){
            this.updateResult();
            this.render();
        });

    },
    updateResult:function(){
        var result = this.view.get(this.val);
        if (_.isFunction(result)) this.result = result.call(this.view);
        else this.result = result;
    }
});