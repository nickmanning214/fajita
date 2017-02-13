import Directive from "./directive";

export default Directive.extend({
    name:"href",
    childInit:function(){
        this.href = this.view.viewModel.get(this.val);
        this.listenTo(this.view.viewModel,"change:"+this.val,function(){
            this.href = this.view.viewModel.get(this.val);
            this.render();
        })
    },
    build:function(){
        if (this.$el.prop("tagName")=="A") this.$el.attr("href",this.href);
        else {
            var a = document.createElement("a");
            a.classList.add("wrapper-a")
            a.setAttribute("href",this.href);
            this.wrapperA = a;
            this.$el.wrap(a);
        }
    },
    render:function(){
        if (this.$el.prop("tagName")=="A") $(this.el).attr("href",this.href)
        else {
            this.wrapperA.setAttribute("href",this.href);
        }
    }
});