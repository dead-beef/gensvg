'use strict'

const fs = require('fs');

const resize = (x) => 1 + Math.sqrt(Math.sqrt(x));

module.exports = {
	defaults: {
		'input': null,
		'output': null,

		'width': null,
		'height': null,

		'node_id': false,
		'resize': true,
		'links': false,

		'gravity': 0.05,
		'distance': 50,
		'charge': -200,

		'max_ticks': 1000,
		'save_interval': -1,

		'debug': false,

		'style': {
			'node': 'stroke:#ddd;fill:#555;stroke-width:3px;',
			'text': 'stroke:#333;stroke-width:1px;',
			'link':	'stroke:#aaa;stroke-opacity:0.75;'
		}
	},

	dependencies: [ 'file://' + __dirname + '/d3/d3.v3.min.js' ],

	generate: (settings, window) => {
		const dbg = !settings.debug ? () => {} : function() {
			for(let x of arguments) process.stderr.write(x.toString());
		};

		const nodeSize = settings.resize ? resize : (x) => x;
		const linkSize = nodeSize;

		let svg = window.d3.select('svg')
			.attr('width', settings.width)
			.attr('height', settings.height);

		let json = JSON.parse(fs.readFileSync(settings.input));

		if(settings.node_id)
		{
			let nodeIndex = {};
			for(let i = 0; i < json.nodes.length; ++i)
			{
				nodeIndex[json.nodes[i].id] = i;
			}
			for(let l of json.links)
			{
				l.source = nodeIndex[l.source];
				l.target = nodeIndex[l.target];
			}
			nodeIndex = undefined;
		}

		let force = window.d3.layout.force()
			.gravity(settings.gravity)
			.distance(settings.distance)
			.charge(settings.charge)
			.size([settings.width, settings.height])
			.nodes(json.nodes)
			.links(json.links);

		let link = svg.selectAll('.link')
			.data(json.links)
			.enter().append('line')
			.attr('style', settings.style.link)
			.style('stroke-width', (d) => linkSize(d.value));

		let node = svg.selectAll('.node')
			.data(json.nodes)
			.enter().append('g')
			.call(force.drag);

		node.append('circle')
			.attr('r', (d) => nodeSize(d.value))
			.attr('style', settings.style.node);

		let container = node;

		if(settings.links)
		{
			container = container.append('a')
			                     .attr('target', '_blank')
			                     .attr(':xlink:href', (node) => node.link);
		}

		container.append('text')
		         .attr('dx', 12)
		         .attr('dy', '.35em')
		         .text((node) => node.name)
		         .attr('style', settings.style.text);

		let ticks = settings.max_ticks;
		let save = settings.save_interval <= 0 ? ticks : settings.save_interval;

		let file = 0;

		force.start();

		for(let i = 1; i <= ticks; ++i)
		{
			dbg('\r\x1b[K', i, ' / ', ticks);
			force.tick();
			if(i % save == 0 || i === ticks)
			{
				link.attr('x1', (d) => d.source.x)
				    .attr('y1', (d) => d.source.y)
				    .attr('x2', (d) => d.target.x)
				    .attr('y2', (d) => d.target.y);
				node.attr('transform',
				          (d) => 'translate('.concat(d.x, ',', d.y, ')'));

				let fname = settings.output.replace('{N}', file++);
				dbg('\n', fname, '\n');
				fs.writeFileSync(fname,
				                 window.d3.select('svg').node().outerHTML);
			}
		}

		force.stop();
	}
}
