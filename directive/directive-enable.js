import Directive from "./directive";

export default Directive.extend({
    name:"enable",
    childInit:function(){
        this.result = this.view.mappings[this.val].call(this.view);
        this.listenTo(this.view.viewModel,"change",function(){
            this.result = this.view.mappings[this.val].call(this.view);
            this.render();
        });
    },
    build:function(){
        if (!this.result) $(this.el).prop("disabled",true);
        else $(this.el).prop("disabled","");
    },
    render:function(){
        if (!this.result) $(this.el).prop("disabled",true);
        else $(this.el).prop("disabled","");
    }
});
