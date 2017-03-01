/*import _ from "underscore";*/
import Directive from "./directive";

export default Directive.extend({
    name:"data",
    childInit:function(){
        this.content = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel,"change:"+this.val,function(){
            this.content = this.view.viewModel.get(this.val);
            this.render();
        })
    },
    build:function(){
       _.each(this.content,function(val,prop){
           if (_.isFunction(val)) val = val.bind(this.view);
           this.$el.attr("data-"+prop,val)
       }.bind(this))
    },
    render:function(){
       _.each(this.content,function(val,prop){
           if (_.isFunction(val)) val = val.bind(this.view);
           this.$el.attr("data-"+prop,val)
       }.bind(this))
    }
});