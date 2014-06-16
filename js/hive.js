
function getUrlVar(key){
    // https://gist.github.com/1771618
    var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
    return result && unescape(result[1]) || "";
}

startsWith = function(s, pattern) {
    return s.lastIndexOf(pattern, 0) === 0;
}

function degrees(radians) {
    return radians / Math.PI * 180 - 90;
}

var defaultColor = d3.scale.category10()
    .domain(d3.range(20));

    function renderHive(nodes, links, nrAxes, container, infoElement, size, color, angle) {
        size = (typeof size === "undefined") ? 300 : size;
        console.log("size: " + size);

        var width = size,
            height = size,
            innerRadius = size / 20,
            outerRadius = size / 2 - 10,
            nodeRadius = 6;

        var radius = d3.scale.linear()
            .range([innerRadius, outerRadius]);

        color = (typeof color === "undefined") ? defaultColor : color;

        var defaultAngle = d3.scale.ordinal()
            .domain(d3.range(nrAxes + 1))
            .rangePoints([0, 2 * Math.PI]);

        angle = (typeof angle === "undefined") ? defaultAngle : angle;

        var canvas = d3.select(container)
            .attr("width", width)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var svg = canvas.append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        svg.selectAll(".axis")
            .data(d3.range(nrAxes))
            .enter().append("line")
            .attr("class", "axis")
            .attr("transform", function(d) { return "rotate(" + degrees(angle(d)) + ")"; })
            .attr("x1", radius.range()[0])
            .attr("x2", radius.range()[1]);

        svg.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", link()
                    .angle(function(d) { return angle(d.group); })
                    .radius(function(d) { return radius(d.index); }))
            .style("stroke", function(d) { return color(d.source.group); })
            .on("mouseover", linkMouseover)
            .on("mouseout", mouseout);

        svg.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("transform", function(d) { return "rotate(" + degrees(angle(d.group)) + ")"; })
            .attr("cx", function(d) { return radius(d.index); })
            .attr("r", nodeRadius)
            .style("fill", function(d) { return color(d.group); })
            .on("mouseover", nodeMouseover)
            .on("click", nodeClick)
            .on("mouseout", mouseout);

        var hiveInfo = canvas.append("text")
            .classed("tooltip", true)
            .attr("text-anchor", "middle")
            .style("opacity", 1e-6)
            .style("fill", "black")
            .style("font-size", 20)
            .style("font-variant", "small-caps")
            .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

        var selectedInfo = canvas.append("text")
            .classed("tooltip", true)
            .attr("text-anchor", "middle")
            .style("opacity", 1e-6)
            .style("fill", "black")
            .style("font-size", 20)
            .style("font-variant", "small-caps")
            .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

        var textInfo = d3.select(infoElement);

        var selected = undefined;

        // Highlight the link and connected nodes on mouseover.
        function linkMouseover(d) {
            d3.selectAll(".link").classed("active", function(p) { return p.id === d.id; });
            d3.selectAll(".node circle").classed("active", function(p) { return p.id === d.source.id || p.id === d.target.id; });
            //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
            //hiveInfo.text(d.source.name + "→" + d.target.name).style("opacity", 1);
            textInfo.text(d.source.name + " → " + d.target.name + " [" + d.protocol + "]").style("opacity", 1);
        }

        // Highlight the node and connected links on mouseover.
        function nodeMouseover(d) {
            d3.selectAll(".link").classed("active", function(p) { return p.source.id === d.id || p.target.id === d.id; });
            d3.select(this).classed("active", true);
            //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
            //hiveInfo.text(d.name).style("opacity", 1);
            textInfo.text(d.name).style("opacity", 1);
        }
        function nodeClick(d) {
            console.log(d);
            d3.selectAll(".link").classed("selected", false);
            d3.selectAll(".node").classed("selected", false);
            d3.selectAll(".node circle").classed("selected", false);
            selected = d;
            d3.selectAll(".link").classed("selected", function(p) { return p.source.id === d.id || p.target.id === d.id; });
            d3.select(this).classed("selected", true);
            //hiveInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
            //hiveInfo.text(d.name).style("opacity", 1);
            selectedInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
            selectedInfo.text(d.name).style("opacity", 1);
            textInfo.text(d.name).style("opacity", 1);
        }

        // Clear any highlighted nodes or links.
        function mouseout() {
            d3.selectAll(".active").classed("active", false);
            //hiveInfo.style("opacity", 1e-6);
            //hiveInfo.attr("x", "0px").attr("y", "0px");
            textInfo.text("| | |");
        }
    }


addSimpleHive = function(filename, selectedProtocol, groupFun, element, infoElement, size) {
    var nrAxes = 3;

    d3.json(filename, function(connections) {
        var nodes = [];
        connections.nodes.forEach(function(node) {
            var ns = groupFun(node);
            for (var i=0; i<ns.length; i++) {
                nodes.push(ns[i]);
            }
        });

        var links = [];
        var in_count = [], out_count = [];
        connections.links.forEach(function(link) {
            if (link.protocol == selectedProtocol) {
                if (nodes[link.source].group != nodes[link.target].group) {
                    links.push(link);
                    out_count[link.source] = 1;
                    in_count[link.target] = 1;
                }
            } 
        });

        for (var i = nodes.length - 1; i > -1; i--) {
            var node = nodes[i];
            if (isNaN(in_count[i]) && isNaN(out_count[i])) {
                nodes.splice(i, 1);
            }
        }

        var index = [];
        for (var i=0; i<nrAxes; i++) {
            index.push(0);
        };
        nodes.sort(function(a, b) {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        nodes.forEach(function(node) {
            node.index = index[node.group]++;
        });
        nodes.forEach(function(node) {
            node.index /= (index[node.group] - 1);
        })
        links.forEach(function(link) {
            link.source = connections.nodes[link.source];
            link.target = connections.nodes[link.target];
            link.id = link.source.name + link.target.name;
        });

        renderHive(nodes, links, nrAxes, element, infoElement, size);
    })
}

function createGroupFunction(mapping) {
    console.log(mapping);
    grouping = function(node) {
        var result = 0;
        for (var key in mapping) {
            var mapped = mapping[key];
            if (typeof mapped != "undefined") {
                if (startsWith(node.name, key)) {
                    result = mapped;
                    break;
                }
            }
        }
        node.id = node.ip;
        node.group = result;
        return [node];
    }
    grouping.description = Array();
    for (var key in mapping) {
        var mapped = mapping[key];
        if (typeof mapped != "undefined") {
            grouping.description[mapped] =
                (typeof grouping.description[mapped] === "undefined") ?
                    key : grouping.description[mapped] + "/" + key;
        }
    }
    if ($.inArray(0, grouping.description)) {
        grouping.description[0] = "...";
    }
    return grouping;
}

addSelfConnectedHive = function(filename, selectedProtocol, groupFun, element) {
  d3.json(filename, function(connections) {
    var nrAxes = 2 * 3;
    var links = [];
    var connected = [];
    connections.links.forEach(function(link) {
      if (link.protocol == selectedProtocol) {
        links.push(link);
        connected[link.source] = 1;
        connected[link.target] = 1;
      }
    });

    var nodes = [], newNodes = [];
    var i = 0;
    connections.nodes.forEach(function(node) {
      node.nr = i++;
      var ns = groupFun(node);
      for (var i=0; i<ns.length; i++) {
        var node = ns[i];
        node.group = 2 * node.group;
        nodes.push(node);

        var newNode = {"name": node.name, "id": node.id, "group": node.group + 1};
        newNodes.push(newNode);
      }
    });

    var conn_count = [];
    links.forEach(function(link) {
      var source = nodes[link.source];
      var target = nodes[link.target];
      if (source.group == target.group) {
        target = newNodes[link.target];
      } else if ((source.group + 2) % nrAxes == target.group) {
        source = newNodes[link.source];
      } else if ((source.group + nrAxes - 2) % nrAxes == target.group) {
        target = newNodes[link.target];
      } else {
        console.log("linked nodes not adjacent: " + source.name + " -> " + target.name);
      }

      link.source = source;
      link.target = target;
      link.id = link.source.name + link.target.name;
    });
    for (var i = nodes.length - 1; i > -1; i--) {
      var node = nodes[i];
      if (isNaN(connected[i])) {
        nodes.splice(i, 1);
        newNodes.splice(i, 1);
      }
    }
    var index = [];
    for (var i=0; i<nrAxes; i++) {
      index.push(0);
    };
    nodes = nodes.concat(newNodes);
    nodes.sort(function(a, b) {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
    nodes.forEach(function(node) {
      node.index = index[node.group]++;
    });
    nodes.forEach(function(node) {
      node.index /= (index[node.group] - 1);
    })

    var groupDiff = .4;
    renderHive(nodes, links, nrAxes, element,
      600,
      color = function(group) {return defaultColor(Math.floor(group / 2));},
      angle = function(group) {
        group = group - groupDiff / 2 - (1 - groupDiff) * (group % 2);
        return group * 2 * Math.PI / nrAxes;
      }
    );
  })
}

calcIndices = function(nodes) {
    nodes.forEach(function(node) {
        var sum = 0;
        for (var i = 0; i < node.name.length; i++) {
            sum += node.name.charCodeAt(i);
        }
        //console.log(node.name + ": " + sum);
        node.index = (131 * sum % 1000) / 1000.0;
    });
    return nodes;
}


// TODO combine with renderHive
    function renderHive2(nodes, links, nrAxes, container, infoElement, size, nodeColor, linkColor, angle) {
        size = (typeof size === "undefined") ? 300 : size;
        console.log("size: " + size);

        var nodeRadius = 6,
            border = 10,
            width = size,
            height = size / 2,
            innerRadius = size / 20,
            outerRadius = size / 2 - border;

        var radius = d3.scale.linear()
            .range([innerRadius, outerRadius]);

        var defaultAngle = d3.scale.ordinal()
            .domain(d3.range(nrAxes + 1))
            .rangePoints([0, 2 * Math.PI]);

        angle = (typeof angle === "undefined") ? defaultAngle : angle;

        var canvas = d3.select(container)
            .attr("width", width)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var svg = canvas.append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height - border) + ")");

        svg.selectAll(".axis")
            .data(d3.range(nrAxes))
            .enter().append("line")
            .attr("class", "axis")
            .attr("transform", function(d) { return "rotate(" + degrees(angle(d)) + ")"; })
            .attr("x1", radius.range()[0])
            .attr("x2", radius.range()[1]);

        svg.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", link()
                    .angle(function(d) { return angle(d.group); })
                    .radius(function(d) { return radius(d.index); }))
            .style("stroke", function(d) { return linkColor(d); })
            .on("mouseover", linkMouseover)
            .on("mouseout", mouseout);

        svg.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("transform", function(d) { return "rotate(" + degrees(angle(d.group)) + ")"; })
            .attr("cx", function(d) { return radius(d.index); })
            .attr("r", nodeRadius)
            //.style("fill", function(d) { return nodeColor(d); })
            .on("mouseover", nodeMouseover)
            .on("click", nodeClick)
            .on("mouseout", mouseout);

        var hiveInfo = canvas.append("text")
            .classed("tooltip", true)
            .attr("text-anchor", "middle")
            .style("opacity", 1e-6)
            .style("fill", "black")
            .style("font-size", 20)
            .style("font-variant", "small-caps")
            .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

        var selectedInfo = canvas.append("text")
            .classed("tooltip", true)
            .attr("text-anchor", "middle")
            .style("opacity", 1e-6)
            .style("fill", "black")
            .style("font-size", 20)
            .style("font-variant", "small-caps")
            .style("text-shadow", "rgba(255, 255, 255, 1) 0px 0px 2px");

        var textInfo = d3.select(infoElement);

        var selected = undefined;

        function linkMouseover(d) {
            d3.selectAll(".link").classed("active", function(p) { return p.id === d.id; });
            d3.selectAll(".node circle").classed("active", function(p) { return p.id === d.source.id || p.id === d.target.id; });
            textInfo.text(d.source.name + " ⎯[" + d.protocol + "]→ " + d.target.name);
        }

        function nodeMouseover(d) {
            d3.selectAll(".link").classed("active", function(p) { 
                return p.source.id === d.id || p.target.id === d.id; 
            });
            d3.selectAll(".node").classed("active", function(n) {
                return n.id === d.id;
            });
            var text = [];
            text.push("selected: " + d.name);
            d3.selectAll(".link.active").each(function(active) {
                text.push(active.source.name + " ⎯[" + active.protocol + "]→ " + active.target.name);
            });
            textInfo.html(text.join("<br>"));
        }
        function nodeClick(d) {
            console.log(d);
            d3.selectAll(".link").classed("selected", false);
            d3.selectAll(".node").classed("selected", false);
            d3.selectAll(".node circle").classed("selected", false);
            selected = d;
            d3.selectAll(".link").classed("selected", function(p) { return p.source.id === d.id || p.target.id === d.id; });
            d3.select(this).classed("selected", true);
            selectedInfo.attr("x", (d3.event.offsetX) + "px").attr("y", (d3.event.offsetY + 30) + "px");
            selectedInfo.text(d.name).style("opacity", 1);
            textInfo.text(d.name).style("opacity", 1);
        }

        function mouseout() {
            d3.selectAll(".active").classed("active", false);
            textInfo.text("");
        }
    }


filteredHive = function(source, namePrefix, container, info, size) {
    console.log("new filteredHive from " + source);
    var nrAxes = 4;

    var nodeColorer = function(node) {
        return "grey";
    };
    var linkColors = {
        'socks': 'yellow',
        'nfs': 'red',
        'jdbc': 'orange',
        'http': 'lightgreen',
        'https': 'darkgreen',
        'jms': 'cyan',
        'tcp': 'tan',
        'smtp': 'wheat',
        'ftp': 'peru',
        'unknown': 'black',

        "ssh": "purple",
        "cfinger": "lightgrey",
        "ldap": "lightgrey",
        "ldaps": "lightgrey",
        "sd": "lightgrey",
    };
    var linkColorer = function(link) {
        var color = linkColors[link.protocol];
        return (color != undefined) ? color : "grey";
    }
    
    var angles = [-Math.PI/20, +Math.PI/20, Math.PI / 2, 3 * Math.PI / 2, 0];
    var flatAngles = function(i) {
        return angles[i];
    };

    var nodes = [];
    console.log("nodes so far 1:");
    console.log(nodes);
    var links = [];
    var selectedNodes = [];

    var distributeLinksOnHive = function(selectedIds) {
    console.log("nodes so far 2:");
        nodes.forEach(function(node) {
            console.log(node.name + " " + node.group);
        });
        nodes = calcIndices(nodes);
        nodes.forEach(function(node) {
            node.id = node.name;
        });
        console.log("nodes:");
        console.log(nodes);
        console.log("selected ids:");
        console.log(selectedIds);
        var groups = [];
        for (var i = 0; i < nrAxes; i++) {
            groups.push(Object());
        }

        var putNodeInGroup = function(link, side, group) {
            var node = nodes[link[side]];
            console.log("put node " + node.name + " on side " + side + " in group " + group);
            if (node.group === undefined) {
                node.group = group;
                groups[group][node.name] = node;
                link[side] = node;
            } else {
                var groupedNode = groups[group][node.name];
                if (groupedNode === undefined) {
                    groupedNode = Object();
                    groupedNode.name = nodes[link[side]].name;
                    groupedNode.id = nodes[link[side]].id;
                    groupedNode.index = nodes[link[side]].index;
                    groupedNode.group = group;
                    groups[group][groupedNode.name] = groupedNode;
                    nodes.push(groupedNode);
                }
                link[side] = groupedNode;
            }
        };
        links.forEach(function(link) {
            console.log(link);
            if (selectedIds.indexOf(link.source) >= 0) {
                console.log(link.source + " in " + selectedIds);
                putNodeInGroup(link, "source", 1);
            } else {
                putNodeInGroup(link, "source", 3);
            }
            if (selectedIds.indexOf(link.target) >= 0) {
                putNodeInGroup(link, "target", 0);
            } else {
                putNodeInGroup(link, "target", 2);
            }

            try {
                link.id = link.source.name + " " + link.target.name;
            } catch(e) {
                link.id = "__unknown__";
            }
        });
    }

    var fetchDataFromFile = function(filename, namePrefix, callback) {
        console.log("fetching");
        var nodePattern = new RegExp(namePrefix, "i");
        console.log(nodePattern);

        d3.json(filename, function(connections) {
            console.log(connections);
            var selected2all = {};
            var selectedIds = [];
            connections.nodes.forEach(function(node, id) {
                if (nodePattern.test(node.name)) {
                    selected2all[id] = nodes.length;
                    selectedIds.push(nodes.length);
                    nodes.push(node);
                }
            });
            selectedIds.forEach(function(id) {
                selectedNodes.push(nodes[id]);
            });
            console.log(selectedNodes);
            selectedNodes.forEach(function(node) {
                console.log(node.name + " " + node.group);
            });
    
            connections.links.forEach(function(link) {
                if ((link.source in selected2all) || (link.target in selected2all)) {
                    links.push(link);
                }
            });
    
            links.forEach(function(link) {
                if (!(link.source in selected2all)) {
                    selected2all[link.source] = nodes.length;
                    nodes.push(connections.nodes[link.source]);
                }
                link.source = selected2all[link.source];
                if (!(link.target in selected2all)) {
                    selected2all[link.target] = nodes.length;
                    nodes.push(connections.nodes[link.target]);
                }
                link.target = selected2all[link.target];
            });
    
            distributeLinksOnHive(selectedIds);
            callback();
        })
    }

    var fetchDataFromNeo4j = function(entrypoint, namePrefix, callback) {
        var nodePattern = new RegExp(namePrefix, "i");
        var data = JSON.stringify({"query" : "START n = node(*) MATCH m-[r]-n WHERE (m.type = \"host\" AND n.type = \"host\") AND (m.label =~ \"" + namePrefix + ".*\" OR n.label =~ \"" + namePrefix + ".*\") RETURN n.name AS source, r.protocol AS protocol, m.name AS target;"  });
        console.log(data);
        $.ajax({
            type:"POST",
            url: entrypoint,
            accepts: "application/json",
            dataType: "json",
            contentType:"application/json",
            headers: { 
                "X-Stream": "true"    
            },
            data: data,
            success: function(response, textStatus, jqXHR){
                console.log(response);
                var nextIndex = 0;
                var node2id = {};
                var id2node = {};
                links = [];
                response.data.forEach(function(link) {
                    [0, 2].forEach(function(i) {
                        var node = link[i];
                        var id = node2id[node];
                        if (id != undefined) {
                            //
                        } else {
                            node2id[node] = nextIndex;
                            id2node[nextIndex] = node;
                            nextIndex++;
                        }
                    })
                    var newLink = {};
                    newLink.source = node2id[link[0]];
                    newLink.target = node2id[link[2]];
                    newLink.protocol = link[1];
                    links.push(newLink);
                });
                nodes = [];
                var selectedIds = [];
                for (var i = 0; i < nextIndex; i++) {
                    var node = {};
                    node.name = node.id = id2node[i];
                    nodes.push(node);
                    if (nodePattern.test(node.name)) {
                        selectedIds.push(i);
                    }
                }
                distributeLinksOnHive(selectedIds);
                callback();
            },
            error: function(jqXHR, textStatus, errorThrown){
                console.log(errorThrown);
                console.log(textStatus);
            }
        });
    }

    var container = info = size = undefined;

    var callback = function() {};

    var hive = {};

    var _render = function() {
        console.log("rendering");
        console.log(nodes);
        console.log(links);
        console.log(container);
        renderHive2(nodes, links, nrAxes, container, info, size, nodeColorer, linkColorer, flatAngles);
        callback(hive);
    }
    hive.render = function(_container, _info, _size) {
        container = _container;
        info = _info;
        size = _size;
        return this;
    };
    hive.then = function(_callback) {
        callback = _callback;
        return this;
    }
    hive.createRegExpForSelectedNodes = function() {
        var names = [];
        selectedNodes.forEach(function(node) {
            names.push(node.name);
        });
        return names.join("|");
    };


    if (source.indexOf("://") >= 0) {
        fetchDataFromNeo4j(source, namePrefix, _render);
    } else {
        fetchDataFromFile(source, namePrefix, _render);
    }

    return hive;
}





