var delta_order = 100.0;
var debug_context = {};

var context_widgets = {

    current_view: "#widget_view",

    get_domain: function (url) {
        return url.replace('http://','').replace('https://','').split("/")[0]; ///[/?#]/)[0];
    },

    transit_view: function (next) {
        if (context_widgets.current_view === next) return;
        
        $(next).css({"z-index": -1})
        $(next).show();
        var opts = {};
        var prev = context_widgets.current_view;
        $(context_widgets.current_view).effect("fade", opts, 200, function() {
            $(prev).hide();
            $(next).css({"z-index": 0});
        });
        context_widgets.current_view = next;
    },

    get_uuid: function() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }   
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
    },

    update_order: function (store, uuid, newOrd, callback) {
        console.log("Update y-index of widget [" + uuid + "] to " + newOrd);
        var key = "widget_" + uuid;
        store.get(key, function(o) {
            var update = {}
            var widget = o[key];
            widget.ord = newOrd;
            update[key] = widget;

            store.set(update, function() {
                callback();
            });
        });
    },

    add_widget: function(store, key, new_widget, callback) {
        store.get('widgets', function(o) {
            var keys = [];
            if ('widgets' in o) {
                keys = o.widgets;
            }
            keys.push(key);
            store.set({widgets: keys}, function() {
                
                var update = {};
                update[key] = new_widget;
                store.set(update, function() {
                    callback();
                });
            });
        });
    },

    get_last_widget_order: function() {
        var ord = parseFloat($(".widget_body:last").data("ord"));
        return ord || 0.0;
    },


    add_recent_pages: function() {
        $("#rp_add").button().click(function (ev) {
            ev.preventDefault();
            var uuid = context_widgets.get_uuid();
            var new_widget = {
                'ord': context_widgets.get_last_widget_order() + delta_order,
                'uuid': uuid,
                'type': 'RP',
                'condtype': 'url_re',
                'condkey': $('#rp_cond_field')[0].value,
                'search': $('#rp_key_field')[0].value,
                'num': parseInt($('#rp_num_field')[0].value)
            };
            key = "widget_" + uuid;

            try {
                context_widgets.add_widget(chrome.storage.sync, key, new_widget, function() {
                    context_widgets.show_widgets();
                });                
            } catch(err) {
                console.log(err);
                throw err;
            }
  
        });

        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
            var tab = tabs[0];
            var url = tab.url;
            var title = tab.title;
            var domain = context_widgets.get_domain(url);

            $('#rp_cond_field')[0].value = domain;
            $('#rp_key_field')[0].value = domain;
            
            $('#rp_num_field').spinner().spinner("value", 3);

            context_widgets.transit_view("#add_recent_pages_form");
        });

    },

    add_link: function() {
        $("#add").button().click(function (ev) {
            ev.preventDefault();
            var uuid = context_widgets.get_uuid();
            var new_widget = {
                'ord': context_widgets.get_last_widget_order() + delta_order,
                'uuid': uuid,
                'type': 'link',
                'title': $('#title_field')[0].value,
                'condtype': 'url_re',
                'condkey': $('#cond_field')[0].value,
                'link_href': $('#link_field')[0].value
            };
            key = "widget_" + uuid;
            try {
                context_widgets.add_widget(chrome.storage.sync, key, new_widget, function() {
                    context_widgets.show_widgets();
                });                
            } catch(err) {
                console.log(err);
                throw err;
            }
        });
        
        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
            var tab = tabs[0];
            var url = tab.url;
            var title = tab.title;
            var domain = context_widgets.get_domain(url);

            $('#cond_field')[0].value = domain;
            $('#link_field')[0].value = url;
            $('#title_field')[0].value = title;
            context_widgets.transit_view("#add_link_form");
        });
    },

    render_html: function(widget) {
        if (widget.type == 'link') {
            return '<div class="link_widget_body"><span class="ui-icon ui-icon-bookmark" style="float:left; margin-left:10px; margin-right:10px;"></span> <a href="' + widget.link_href + '" class="widget_link">' + widget.title + '</a> </div>';
        } else if (widget.type == 'RP') {
            var stt = Date.now() - 1000.0 * 60.0 * 60.0 * 24.0 * 7.0;
            chrome.history.search(
                {text: widget.search, maxResults: widget.num, startTime: stt}, 
                function (items) {
                    var html = '<span class="rp_header">Recent visits: </span>';
                    for (var i = 0; i < items.length; ++ i) {
                        html += '<a class="widget_link" href="'+items[i].url+'"><span style="display: inline-block" class="ui-icon ui-icon-arrowreturnthick-1-w"></span>'+items[i].title+'</a>';
                        if (i + 1 < items.length) html += ", ";
                    }
                    $("#RP_" + widget.uuid).html(html);
                    $(".widget_link").click(function(ev) {
                        ev.preventDefault();
                        console.log(this.href);
                        context_widgets.open_link(this.href);
                    });
                });

            return '<div class="RP_widget_body" id="RP_' + widget.uuid+ '">Show RP Widget here</div>';
        }
    },

    check_condition: function(tab, widget) {
        var url = tab.url;
        //return true; // for debug
        if (url.search(widget.condkey) >= 0) return true;
        return false;
    },

    delete_widget: function(wid, callback) {
        var delkey = "widget_" + wid;
        chrome.storage.sync.get('widgets', function(o1) {
            var keys = []
            if ('widgets' in o1) keys = o1['widgets'];
            var newkeys = keys.filter(function(v, i) {
                var ret = (v !== delkey);
                return ret;
            });
            chrome.storage.sync.set({'widgets': newkeys}, function() {
                chrome.storage.sync.remove(delkey, function() { 
                    callback();
                });
            });
        });
    },

    open_link: function(url) {
        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
            var tab = tabs[0];
            chrome.tabs.update(tab.id, {url: url}, function () {
            });
        });
    },


    show_widgets: function() {
        chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
            var tab = tabs[0];
            chrome.storage.sync.get('widgets', function(o1) {
                var keys = []
                if ('widgets' in o1) keys = o1['widgets'];
                chrome.storage.sync.get(keys, function (o2) {
                    var html = '';

                    var newkeys = [];
                    for (var i = 0; i < keys.length; ++ i) {
                        var widget = o2[keys[i]];
                        if (! context_widgets.check_condition(tab,widget)) 
                            continue;
                        newkeys.push(keys[i]);
                    }
                    keys = newkeys;
                    keys.sort(function (a, b) {
                        var ord_a = o2[a].ord || 0.0;
                        var ord_b = o2[b].ord || 0.0;
                        if (ord_a < ord_b) return -1;
                        if (ord_a > ord_b) return 1;
                        return 0;
                    });

                    for (var i = 0; i < keys.length; ++ i) {
                        var widget = o2[keys[i]];
                        var ord = widget.ord || 0.0;
                        html += '<li class="ui-state-default">';
                        html += '<div class="widget_body" data-widget-id="'+widget.uuid+'" data-ord="' + ord + '">'
                        html += context_widgets.render_html(widget);
                        html += '</div>'
                        html += '<a href="" class="widget_delete_button" data-widget-id="' + widget.uuid + '"></a>';
                        html += "</li>";
                    }
                    $("#widget_list").html(html + '');

                    context_widgets.transit_view("#widget_view");

                    $(".widget_link").click(function(ev) {
                        ev.preventDefault();
                        console.log(this.href);
                        context_widgets.open_link(this.href);
                    });

                    $(".widget_delete_button")
                        .button({class: "delete_button", 
                                 text: false,
                                 icons: {primary: "ui-icon-close"}})
                        .click(function (ev) {
                            ev.preventDefault();
                            //alert($(this).data("widgetId"));
                            var wid = $(this).data("widgetId");
                            context_widgets.delete_widget(wid, function() {
                                context_widgets.show_widgets();
                            });
                        });
                    
                    $("#widget_list").sortable({
                        update: function(event, ui) {
                            var before = ui.item.before();
                            var next = ui.item.next();
                            var hasBefore = ui.item != before;
                            var hasNext = ui.item != next;
                            var beforeOrd = 0.0;
                            var nextOrd = 0.0;
                            if (hasBefore) {
                                beforeOrd = parseFloat(
                                    before.children(".widget_body").data("ord"));
                            }
                            if (hasNext) {
                                nextOrd = parseFloat(
                                    next.children(".widget_body").data("ord"));
                            }
                            var uuid = 
                                ui.item.children(".widget_body").data("widgetId");
                            var newOrd = parseFloat(
                                ui.item.children(".widget_body").data("ord"));

                            if (hasBefore && hasNext) {
                                newOrd = (beforeOrd + nextOrd) / 2.0;
                            } else if (hasBefore) {
                                newOrd = beforeOrd + delta_order;
                            } else if (hasNext) {
                                newOrd = nextOrd - delta_order;
                            }
                            ui.item.children(".widget_body").data("ord", newOrd);
                            context_widgets.update_order(chrome.storage.sync,
                                                         uuid, newOrd, 
                                                         function () { });
                        }
                    });
                    $("#widget_list").disableSelection();
                    $("#add_link").button().click(function (ev) {
                        ev.preventDefault();
                        context_widgets.add_link();
                    });
                    $("#add_recent_page").button().click(function (ev) {
                        ev.preventDefault();
                        context_widgets.add_recent_pages();
                    });
                });
            });
        });
    },
    
};

// Run our kitten generation script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {
    context_widgets.show_widgets();
});
