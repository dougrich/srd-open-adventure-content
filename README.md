# Open Adventure SRD

## Contributing

You can contribute by reading the raw ODTs and moving them into articles and tables. You can find the open adventure repository here:

https://github.com/openadventure/Open-Adventure

When in doubt, anything in that repository is considered source of truth, and should be used to maintain the content here.

### Content Structure

There are two types of content: articles, which are free-form HTML content, and templated data, which has a template applied to the same type of data over and over (think monsters or tables or spells). All content is located in the 'sources' folder, which listed the conceptual sources. Required sources are included by default - see their respective source.json for which sources are required.

Some sources override default source behaviour. For example, intermediate-core overrides the equipment template to include the weight column. The override order is determined by priority: lower numbers are overriden by higher numbers.

**Future work**: Figure out how images fit into this

### Packaging + Build Output

There are three aggregate tasks: build, watch, and pack. In addition to this, there is the deploy operation

##### Build
Build will flatten all of the articles, templates, etc. into a couple files per source, as well as do a full index pass, manifest pass, and legal pass. It drops these into the temp folder.

##### Watch
Watch will execute a partial build whenever content changes.

##### Pack
Pack will take the index, manifest, legal, and any required sources and put them into the single core.js; then, it will flatten remaining sources into a single file and copy it over into the destination.

##### Deploy
Deploy assumes you have google cloud installed, and it will copy the srd contents to the edge node

## Legal

Code around the build process is released under the MIT license found in CODE-LICENSE.

Content from Open Adventure is licensed under the Creative Commons Attribution-ShareAlike 4.0 International Public License.

"Open Adventure" and "OA" are trademarks of Kyle Mecklem.