# Open Adventure SRD

## Contributing

You can contribute by reading the raw ODTs and moving them into articles and tables. You can find the open adventure repository here:

https://github.com/openadventure/Open-Adventure

When in doubt, anything in that repository is considered source of truth, and should be used to maintain the content here.

### Content Structure

There are two types of content: articles, which are free-form HTML content, and templated data, which has a template applied to the same type of data over and over (think monsters or tables or spells). All content is located in the 'sources' folder, which listed the conceptual sources. Required sources are included by default - see their respective source.json for which sources are required.

Some sources override default source behaviour. For example, intermediate-core overrides the equipment template to include the weight column. The override order is determined by priority: lower numbers are overriden by higher numbers.

### Packaging

When 'gulp build' is run, it produces a number of javascript files for inclusion in the dist, and a number of temporary fragments in the temp folder. Each source gets a single javascript file 'package'.

**Future work** should involve packing content further by combining any required sources, legal, and manifest into a single source file.

**Future work** hook up indexing system

## Legal

Code around the build process is released under the MIT license found in CODE-LICENSE.

Content from Open Adventure is licensed under the Creative Commons Attribution-ShareAlike 4.0 International Public License.

"Open Adventure" and "OA" are trademarks of Kyle Mecklem.