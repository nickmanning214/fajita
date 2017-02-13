import Directive from "./directive";

export default Directive.extend({
    name:"src",
    childInit:function(){
        this.src = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel,"change:"+this.val,function(){
            this.src = this.view.viewModel.get(this.val);
            this.render();
        });
    },
    build:function(){
        this.$el.attr("src",this.src);
    },
    render:function(){
        this.$el.attr("src",this.src);
    }
});