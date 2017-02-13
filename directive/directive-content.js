import Directive from "./directive";

export default Directive.extend({
    name:"content",
    childInit:function(){
        this.content = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel,"change:"+this.val,function(){
            this.content = this.view.viewModel.get(this.val);
            this.render();
        })
    },
    build:function(){
       
        this.$el.html(this.content)
    },
    render:function(){
        this.$el.html(this.content)
    }
});