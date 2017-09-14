'use strict';

const fs = require('fs');
const crypto = require('crypto');

const color = (type, x, y, z) => type.concat('(', x, ',', y, ',', z, ')');
const random = (max) => Math.floor(Math.random() * max);
const hash = (word) => crypto.createHash('md5').update(word).digest();

const randomColor = () => color('rgb', random(128), random(128), random(128));

const hashColor = (word) => {
	let h = hash(word.text);
	return color('rgb', h[0] & 0x7F, h[1] & 0x7F, h[2] & 0x7F);
};

const resize = (x) => 8 + Math.sqrt(x);

module.exports = {
	defaults: {
		'input': null,
		'output': null,
		'debug': false,
		'links': false,
		'resize': true,
		'font': 'monospace',
		'padding': 10,
		'minWidth': 512,
		'minHeight': 512,
		'precision': 100,
		'randomColors': false
	},

	dependencies: [
		'file://' + __dirname + '/d3/d3.v3.min.js',
		'file://' + __dirname + '/d3/d3.layout.cloud.js'
	],

	generate: (settings, window) => {
		const dbg = settings.debug ? console.error : () => {};
		const wordSize = settings.resize ? resize : (x) => x;
		const color = settings.randomColors ? randomColor : hashColor;

		let svg = window.d3.select('svg');

		let json = JSON.parse(fs.readFileSync(settings.input));
		let words = null;

		let cloudWidth = settings.minWidth;
		let cloudHeight = settings.minHeight;

		let cloud = window.d3.layout.cloud();

		for(let word of json)
		{
			word.size = wordSize(word.size);
		}

		cloud.words(json)
		     .text((word) => word.text)
		     .fontSize((word) => word.size)
		     .padding(settings.padding)
		     .rotate(0)
		     .font(settings.font)
		     .start();

		dbg('inc');

		do
		{
			cloud.size([cloudWidth, cloudHeight]);
			words = cloud.step();
			dbg(' ', cloudWidth, 'x', cloudHeight,
			    ' | ', words.length, '/', json.length);
			cloudWidth <<= 1;
			cloudHeight <<= 1;
		} while(words.length < json.length);

		cloudWidth >>>= 1;
		cloudHeight >>>= 1;

		dbg('dec');

		let minWidth = cloudWidth >>> 1;
		let minHeight = cloudWidth >>> 1;

		let maxWidth = cloudWidth;
		let maxHeight = cloudHeight;

		while(maxWidth - minWidth > settings.precision
		      || maxHeight - minHeight > settings.precision)
		{
			cloudWidth = (maxWidth + minWidth) >>> 1;
			cloudHeight = (maxWidth + minWidth) >>> 1;

			cloud.size([cloudWidth, cloudHeight]);
			words = cloud.step();
			dbg(' ', cloudWidth, 'x', cloudHeight,
			    ' | ', words.length, '/', json.length);

			if(words.length < json.length)
			{
				minWidth = cloudWidth;
				minHeight = cloudHeight;
			}
			else
			{
				maxWidth = cloudWidth;
				maxHeight = cloudHeight;
			}
		}

		if(words.length < json.length)
		{
			cloudWidth = maxWidth;
			cloudHeight = maxHeight;
			cloud.size([cloudWidth, cloudHeight]);
			words = cloud.step();
			dbg(' ', cloudWidth, 'x', cloudHeight,
			    ' | ', words.length, '/', json.length);
		}

		let x0 = cloudWidth >>> 1;
		let y0 = cloudHeight >>> 1;

		let container = svg.attr('width', cloudWidth)
		                   .attr('height', cloudHeight)
		                   .append('g')
		                   .selectAll('.word')
		                   .data(words)
		                   .enter();

		if(settings.links)
		{
			container = container.append('a')
			                     .attr(':xlink:href', (word) => word.link)
			                     .attr('target', '_blank')
			                     .attr('class', 'word');
		}

		container.append('text')
		         .attr('text-anchor', 'middle')
		         .attr('x', (word) => x0 + word.x)
		         .attr('y', (word) => y0 + word.y)
		         .attr('font-family', settings.font)
		         .attr('font-size', (word) => word.size)
		         .style('fill', color)
		         .text((word) => word.text);

		fs.writeFileSync(settings.output,
		                 window.d3.select('svg').node().outerHTML);
	}
};
