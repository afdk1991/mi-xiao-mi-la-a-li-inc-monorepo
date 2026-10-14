INSERT INTO articles (slug, title, category, summary, body, source, source_url, license, original, read_time, updated) VALUES
('nginx-beginner','nginx 新手指南：启动停止、配置结构与静态/代理服务（官方文档全文）','D','nginx 官方新手指南全文：主进程与 worker 进程模型、启动停止与重载配置、配置文件结构、静态内容服务、反向代理与 FastCGI 代理配置。','<div class="article-note"><b>来源：</b>nginx.org 官方文档　·　<b>许可：</b>2-clause BSD（nginx 官方文档）<br><b>原文链接：</b><a href="https://nginx.org/en/docs/beginners_guide.html" target="_blank" rel="noopener">https://nginx.org/en/docs/beginners_guide.html</a></div><h2>Beginner’s Guide</h2><div class="table-wrap"><table><tr><td>Starting, Stopping, and Reloading Configuration<br>Configuration File’s Structure<br>Serving Static Content<br>Setting Up a Simple Proxy Server<br>Setting Up FastCGI Proxying<br></td></tr></table></div><p>
This guide gives a basic introduction to nginx and describes some
simple tasks that can be done with it.
It is supposed that nginx is already installed on the reader’s machine.
If it is not, see the Installing nginx page.
This guide describes how to start and stop nginx, and reload its
configuration, explains the structure
of the configuration file and describes how to set up nginx
to serve out static content, how to configure nginx as a proxy
server, and how to connect it with a FastCGI application.
</p><p>
nginx has one master process and several worker processes.
The main purpose of the master process is to read and evaluate configuration,
and maintain worker processes.
Worker processes do actual processing of requests.
nginx employs event-based model and OS-dependent mechanisms to efficiently
distribute requests among worker processes.
The number of worker processes is defined in the configuration file and
may be fixed for a given configuration or automatically adjusted to the
number of available CPU cores (see
worker_processes).
</p><p>
The way nginx and its modules work is determined in the configuration file.
By default, the configuration file is named <code>nginx.conf</code>
and placed in the directory
<code>/usr/local/nginx/conf</code>,
<code>/etc/nginx<'
|| '/code>, or
<code>/usr/local/etc/nginx</code>.
</p><h3>Starting, Stopping, and Reloading Configuration</h3><p>
To start nginx, run the executable file.
Once nginx is started, it can be controlled by invoking the executable
with the <code>-s</code> parameter.
Use the following syntax:
</p> <blockquote><pre>
nginx -s <i>signal</i>
</pre></blockquote><p> 
Where <i>signal</i> may be one of the following:
</p> <ul>
<li>
<code>stop</code> — fast shutdown
</li>
<li>
<code>quit</code> — graceful shutdown
</li>
<li>
<code>reload</code> — reloading the configuration file
</li>
<li>
<code>reopen</code> — reopening the log files
</li>
</ul><p> 
For example, to stop nginx processes with waiting for the worker processes
to finish serving current requests, the following command can be executed:
</p> <blockquote><pre>
nginx -s quit
</pre></blockquote> <blockquote>This command should be executed under the same user that
started nginx.</blockquote><p>
Changes made in the configuration file
will not be applied until the command to reload configuration is
sent to nginx or it is restarted.
To reload configuration, execute:
</p> <blockquote><pre>
nginx -s reload
</pre></blockquote><p>
Once the master process receives the signal to reload configuration,
it checks the syntax validity
of the new configuration file and tries to apply the configuration provided
in it.
If this is a success, the master process starts new worker processes
and sends messages to old worker processes, requesting them to
shut down.
Otherwise, the master process rolls back the changes and
continues to work with the old configuration.
Old worker processes, receiving a command to shut down,
stop accepting new connections and continue to service current requests until
all such requests are serviced.
After that, the old worke'
|| 'r processes exit.
</p><p>
A signal may also be sent to nginx processes with the help of Unix tools
such as the <code>kill</code> utility.
In this case a signal is sent directly to a process with a given process ID.
The process ID of the nginx master process is written, by default, to the
<code>nginx.pid</code> in the directory
<code>/usr/local/nginx/logs</code> or
<code>/var/run</code>.
For example, if the master process ID is 1628, to send the QUIT signal
resulting in nginx’s graceful shutdown, execute:
</p> <blockquote><pre>
kill -s QUIT 1628
</pre></blockquote><p> 
For getting the list of all running nginx processes, the <code>ps</code>
utility may be used, for example, in the following way:
</p> <blockquote><pre>
ps -ax | grep nginx
</pre></blockquote><p> 
For more information on sending signals to nginx, see
Controlling nginx.
</p><h3>Configuration File’s Structure</h3><p>
nginx consists of modules which are controlled by directives specified
in the configuration file.
Directives are divided into simple directives and block directives.
A simple directive consists of the name and parameters separated by spaces
and ends with a semicolon (<code>;</code>).
A block directive has the same structure as a simple directive, but
instead of the semicolon it ends with a set of additional instructions
surrounded by braces (<code>{</code> and <code>}</code>).
If a block directive can have other directives inside braces,
it is called a context (examples:
events,
http,
server,
and
location).
</p><p>
Directives placed in the configuration file outside
of any contexts are considered to be in the
main context.
The <code>events</code> and <code>http</code> directives
reside in the <code>main</code> context, <code>server</code>
in <code>http</code>, and <code>location</code> in
<code>s'
|| 'erver</code>.
</p><p>
The rest of a line after the <code>#</code> sign is considered a comment.
</p><h3>Serving Static Content</h3><p>
An important web server task is serving out
files (such as images or static HTML pages).
You will implement an example where, depending on the request,
files will be served from different local directories: <code>/data/www</code>
(which may contain HTML files) and <code>/data/images</code>
(containing images).
This will require editing of the configuration file and setting up of a
server
block inside the http
block with two location
blocks.
</p><p>
First, create the <code>/data/www</code> directory and put an
<code>index.html</code> file with any text content into it and
create the <code>/data/images</code> directory and place some
images in it.
</p><p>
Next, open the configuration file.
The default configuration file already includes several examples of
the <code>server</code> block, mostly commented out.
For now comment out all such blocks and start a new
<code>server</code> block:
</p> <blockquote><pre>
http {
 server {
 }
}
</pre></blockquote><p> 
Generally, the configuration file may include several
<code>server</code> blocks
distinguished by ports on which
they listen to
and by
server names.
Once nginx decides which <code>server</code> processes a request,
it tests the URI specified in the request’s header against the parameters of the
<code>location</code> directives defined inside the
<code>server</code> block.
</p><p>
Add the following <code>location</code> block to the
<code>server</code> block:
</p> <blockquote><pre>
location / {
 root /data/www;
}
</pre></blockquote><p> 
This <code>location</code> block specifies the
“<code>/</code>” prefix compared with the URI from the request.
For matching requests, the URI will be added t'
|| 'o the path specified in the
root
directive, that is, to <code>/data/www</code>,
to form the path to the requested file on the local file system.
If there are several matching <code>location</code> blocks nginx
selects the one with the longest prefix.
The <code>location</code> block above provides the shortest
prefix, of length one,
and so only if all other <code>location</code>
blocks fail to provide a match, this block will be used.
</p><p>
Next, add the second <code>location</code> block:
</p> <blockquote><pre>
location /images/ {
 root /data;
}
</pre></blockquote><p> 
It will be a match for requests starting with <code>/images/</code>
(<code>location /</code> also matches such requests,
but has shorter prefix).
</p><p>
The resulting configuration of the <code>server</code> block should
look like this:
</p> <blockquote><pre>
server {
 location / {
 root /data/www;
 }

 location /images/ {
 root /data;
 }
}
</pre></blockquote><p> 
This is already a working configuration of a server that listens
on the standard port 80 and is accessible on the local machine at
<code>http://localhost/</code>.
In response to requests with URIs starting with <code>/images/</code>,
the server will send files from the <code>/data/images</code> directory.
For example, in response to the
<code>http://localhost/images/example.png</code> request nginx will
send the <code>/data/images/example.png</code> file.
If such file does not exist, nginx will send a response
indicating the 404 error.
Requests with URIs not starting with <code>/images/</code> will be
mapped onto the <code>/data/www</code> directory.
For example, in response to the
<code>http://localhost/some/example.html</code> request nginx will
send the <code>/data/www/some/example.html</code> file.
</p><p>
To apply the new configuration, '
|| 'start nginx if it is not yet started or
send the <code>reload</code> signal to the nginx’s master process,
by executing:
</p> <blockquote><pre>
nginx -s reload
</pre></blockquote> <blockquote>
In case something does not work as expected, you may try to find out
the reason in <code>access.log</code> and
<code>error.log</code> files in the directory
<code>/usr/local/nginx/logs</code> or
<code>/var/log/nginx</code>.
</blockquote><h3>Setting Up a Simple Proxy Server</h3><p>
One of the frequent uses of nginx is setting it up as a proxy server, which
means a server that receives requests, passes them to the proxied servers,
retrieves responses from them, and sends them to the clients.
</p><p>
We will configure a basic proxy server, which serves requests of
images with files from the local directory and sends all other requests to a
proxied server.
In this example, both servers will be defined on a single nginx instance.
</p><p>
First, define the proxied server by adding one more <code>server</code>
block to the nginx’s configuration file with the following contents:
</p> <blockquote><pre>
server {
 listen 8080;
 root /data/up1;

 location / {
 }
}
</pre></blockquote><p> 
This will be a simple server that listens on the port 8080
(previously, the <code>listen</code> directive has not been specified
since the standard port 80 was used) and maps
all requests to the <code>/data/up1</code> directory on the local
file system.
Create this directory and put the <code>index.html</code> file into it.
Note that the <code>root</code> directive is placed in the
<code>server</code> context.
Such <code>root</code> directive is used when the
<code>location</code> block selected for serving a request does not
include its own <code>root</code> directive.
</p><p>
Next, use the server configurat'
|| 'ion from the previous section
and modify it to make it a proxy server configuration.
In the first <code>location</code> block, put the
proxy_pass
directive with the protocol, name and port of the proxied server specified
in the parameter (in our case, it is <code>http://localhost:8080</code>):
</p> <blockquote><pre>
server {
 location / {
 proxy_pass http://localhost:8080;
 }

 location /images/ {
 root /data;
 }
}
</pre></blockquote><p>
We will modify the second <code>location</code>
block, which currently maps requests with the <code>/images/</code>
prefix to the files under the <code>/data/images</code> directory,
to make it match the requests of images with typical file extensions.
The modified <code>location</code> block looks like this:
</p> <blockquote><pre>
location ~ \.(gif|jpg|png)$ {
 root /data/images;
}
</pre></blockquote><p> 
The parameter is a regular expression matching all URIs ending
with <code>.gif</code>, <code>.jpg</code>, or <code>.png</code>.
A regular expression should be preceded with <code>~</code>.
The corresponding requests will be mapped to the <code>/data/images</code>
directory.
</p><p>
When nginx selects a <code>location</code> block to serve a request
it first checks location
directives that specify prefixes, remembering <code>location</code>
with the longest prefix, and then checks regular expressions.
If there is a match with a regular expression, nginx picks this
<code>location</code> or, otherwise, it picks the one remembered earlier.
</p><p>
The resulting configuration of a proxy server will look like this:
</p> <blockquote><pre>
server {
 location / {
 proxy_pass http://localhost:8080/;
 }

 location ~ \.(gif|jpg|png)$ {
 root /data/images;
 }
}
</pre></blockquote><p> 
This server will filter requests ending with <code>.gif</code>,'
|| '
<code>.jpg</code>, or <code>.png</code>
and map them to the <code>/data/images</code> directory (by adding URI to the
<code>root</code> directive’s parameter) and pass all other requests
to the proxied server configured above.
</p><p>
To apply new configuration, send the <code>reload</code> signal to
nginx as described in the previous sections.
</p><p>
There are many more
directives that may be used to further configure a proxy connection.
</p><h3>Setting Up FastCGI Proxying</h3><p>
nginx can be used to route requests to FastCGI servers which run
applications built with various frameworks and programming languages
such as PHP.
</p><p>
The most basic nginx configuration to work with a FastCGI server
includes using the
fastcgi_pass
directive instead of the <code>proxy_pass</code> directive,
and fastcgi_param
directives to set parameters passed to a FastCGI server.
Suppose the FastCGI server is accessible on <code>localhost:9000</code>.
Taking the proxy configuration from the previous section as a basis,
replace the <code>proxy_pass</code> directive with the
<code>fastcgi_pass</code> directive and change the parameter to
<code>localhost:9000</code>.
In PHP, the <code>SCRIPT_FILENAME</code> parameter is used for
determining the script name, and the <code>QUERY_STRING</code>
parameter is used to pass request parameters.
The resulting configuration would be:
</p> <blockquote><pre>
server {
 location / {
 fastcgi_pass localhost:9000;
 fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
 fastcgi_param QUERY_STRING $query_string;
 }

 location ~ \.(gif|jpg|png)$ {
 root /data/images;
 }
}
</pre></blockquote><p> 
This will set up a server that will route all requests except for
requests for static images to the proxied server operating on
<code>localhost:9000</code'
|| '> through the FastCGI protocol.
</p><div class="reprint">本文正文摘自 <b>nginx.org 官方文档</b>（2-clause BSD（nginx 官方文档））。原文：<a href="https://nginx.org/en/docs/beginners_guide.html" target="_blank" rel="noopener">https://nginx.org/en/docs/beginners_guide.html</a>。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>','nginx.org 官方文档','https://nginx.org/en/docs/beginners_guide.html','2-clause BSD（nginx 官方文档）',false,'30 分钟','转载自官方原文'),
('sqlite-whentouse','SQLite 官方：什么场景下该用 / 不该用 SQLite（公有领域全文）','E','SQLite 官方「Appropriate Uses」全文：SQLite 与客户端/服务器数据库的区别、最适合的使用场景、应当改用服务端数据库的情形，以及并发写入与网络文件系统的注意事项。','<div class="article-note"><b>来源：</b>sqlite.org 官方文档　·　<b>许可：</b>公有领域（Public Domain，SQLite 官方文档）<br><b>原文链接：</b><a href="https://www.sqlite.org/whentouse.html" target="_blank" rel="noopener">https://www.sqlite.org/whentouse.html</a></div>Small. Fast. Reliable.<br>Choose any three.

<ul>
<li>Home
<li>Menu
<li>About
<li>Documentation
<li>Download
<li>License
<li>Support
<li>Purchase
<li>
Search
</ul>

<ul>
<li>About
<li>Documentation
<li>Download
<li>Support
<li>Purchase
</ul>

Appropriate Uses For SQLite

Table Of Contents
1. Situations Where SQLite Works Well
2. Situations Where A Client/Server RDBMS May Work Better
3. Checklist For Choosing The Right Database Engine

<p>
SQLite is not directly comparable to client/server SQL database engines such
as MySQL, Oracle, PostgreSQL, or SQL Server since SQLite is trying to
solve a different problem.
</p>

<p>
Client/server SQL database engines strive to implement a shared repository
of enterprise data. They emphasize scalability, concurrency, centralization,
and control.
SQLite strives to provide local data storage for
individual applications and devices. SQLite emphasizes economy,
efficiency, reliability, independence, and simplicity.
</p>

<p>
SQLite does not compete with client/server databases.
SQLite competes with fopen().
</p>

<h2>1. Situations Where SQLite Works Well</h2>

<ul>

<li><b>Embedded devices and the internet of things</b>

<p>Because an SQLite database requires no administration,
it works well in devices that must operate without expert human support.
SQLite is a good fit for use in 
cellphones, set-top boxes, televisions, game consoles,
cameras, watches, kitchen appliances, thermostats, automobiles, 
machine tools, airplanes, remote sensors, drones, medical devices,
and robots: the "internet of things".
</p>'
|| '

<p>Client/server database engines are designed to live inside a
lovingly-attended datacenter at the core of the network.
SQLite works there too, but SQLite also thrives at the edge of the network,
fending for itself while providing fast and
reliable data services to applications that would otherwise
have dodgy connectivity.
</p></li>

<li><p><b>Application file format</b></p>

<p>
SQLite is often used as the on-disk file format
for desktop applications such as version control systems,
financial analysis tools, media cataloging and editing suites, CAD
packages, record keeping programs, and so forth. The traditional
File/Open operation calls sqlite3_open() to attach to the database
file. Updates happen automatically as application content is revised
so the File/Save menu option becomes superfluous. The File/Save_As
menu option can be implemented using the backup API.
</p>

<p>There are many benefits to this approach, including improved
performance, reduced cost and complexity, and
improved reliability. See technical notes
"aff_short.html" and 
"appfileformat.html" and
"fasterthanfs.html" for more information.
This use case is closely related to the
data transfer format and
data container use cases below.
</p></li>

<li><p><b>Websites</b></p>

<p>SQLite works great as the database engine for most low to
medium traffic websites (which is to say, most websites).
The amount of web traffic that SQLite can handle depends
on how heavily the website uses its database. Generally
speaking, any site that gets fewer than 100K hits/day should work
fine with SQLite.
The 100K hits/day figure is a conservative estimate, not a
hard upper bound.
SQLite has been demonstrated to work with 10 times that amount
of traffic.</p>

<p>The SQLite website (https://sqlite.org/) uses SQLite itself,
'
|| 'of course, and as of this writing (2015) it handles about 400K to 500K
HTTP requests per day, about 15-20% of which are dynamic pages touching
the database. Dynamic content uses about 200 SQL statements per webpage.
This setup runs on a single VM that shares a physical server with 23 others
and yet still keeps the load average below 0.1 most of the time.

</p><p>See also: Hacker News discussion from 2022-12-13.
</p></li>

<li><p><b>Data analysis</b></p>

<p>
People who understand SQL can employ the 
sqlite3 command-line shell (or various third-party
SQLite access programs) to analyze large
datasets. Raw data can be imported from CSV files, then that
data can be sliced and diced to generate a myriad of summary
reports. More complex analysis can be done using simple scripts written
in Tcl or Python (both of which come with SQLite built-in) or in R or
other languages using readily available adaptors.
Possible uses include website log analysis, sports
statistics analysis, compilation of programming metrics, and
analysis of experimental results. Many bioinformatics researchers
use SQLite in this way.
</p>

<p>
The same thing can be done with an enterprise client/server
database, of course. The advantage of SQLite is
that it is easier to install and use and the resulting database 
is a single file that can be written to a USB memory stick
or emailed to a colleague.
</p>
</li>

<li><p><b>Cache for enterprise data</b></p>

<p>
Many applications use SQLite as a cache of relevant content from
an enterprise RDBMS.
This reduces latency, since most queries now occur against the local
cache and avoid a network round-trip. It also reduces the load 
on the network and on the central database server. And in many cases, 
it means that the client-side application can continue operating du'
|| 'ring
network outages.
</p>
</li>

<li><p><b>Server-side database</b></p>

<p>
Systems designers
report success using SQLite as a data store on server applications
running in the datacenter, or in other words, using SQLite as the underlying
storage engine for an application-specific database server.</p>

<p>With this pattern, the overall system is still client/server:
clients send requests to the server and get back replies over the network.
But instead of sending generic SQL and getting back raw table content, 
the client requests and server responses are high-level and 
application-specific.
The server translates requests into multiple SQL queries, gathers the
results, does post-processing, filtering, and analysis, then constructs
a high-level reply containing only the essential information.</p>

<p>Developers report that SQLite is often faster than a client/server
SQL database engine in this scenario.
Database requests are serialized by the server, so concurrency is not
an issue. Concurrency is also improved by "database sharding":
using separate database files for different subdomains. For
example, the server might have a separate SQLite database for each
user, so that the server can handle hundreds or thousands of simultaneous
connections, but each SQLite database is only used by one connection.</p>
</li>

<li><p><b>Data transfer format</b></p><p>Because an SQLite database is a single compact file in a
well-defined cross-platform format, it is often used
as a container for transferring content from one system to another.
The sender gathers content into an SQLite database file, transfers
that one file to the receiver, then the receiver uses SQL to extract
the content as needed.

</p><p>An SQLite database facilitates data transfer between systems even
when the endpoin'
|| 'ts have different word sizes and/or byte orders.
The data can be a complex mix of large binary blobs, text, and small
numeric or boolean values. The data format can be easily extended
by adding new tables and/or columns, without breaking legacy receivers.
The SQL query language means that receivers are not required to parse
the entire transfer all at once, but can instead query the
received content as needed. The data format is "transparent" in the
sense that it is easily decoded for human viewing using 
a variety of universally available, open-source tools, from multiple
vendors.
</p></li>

<li><p><b>File archive and/or data container</b></p>

<p>
The SQLite Archive idea shows how
SQLite can be used as a substitute for ZIP archives or Tarballs.
An archive of files stored in SQLite is only very slightly larger, and
in some cases actually smaller, than the equivalent ZIP archive.
And an SQLite archive features incremental and atomic updating
and the ability to store much richer metadata.
</p>

<p>Fossil version 2.5 and later offers
SQLite Archive files as a download format, in addition
to traditional tarball and ZIP archive.
The sqlite3.exe command-line shell version 3.22.0 and later will create,
list, or unpack an SQL archive using the 
.archive command.</p>

<p>
SQLite is a good solution for any situation that requires bundling
diverse content into a self-contained and self-describing package 
for shipment across a network.
Content is encoded in a 
well-defined, cross-platform, and stable file format.
The encoding is efficient, and receivers can extract small subsets
of the content without having to read and parse the entire file.
</p>

<p>SQL archives are useful as the distribution format for software
or content updates that are broadcast to many clients. Variations
o'
|| 'n this idea are used, for example, to transmit TV programming guides
to set-top boxes and to send over-the-air updates to vehicle navigation
systems.</p>
</li>

<li><p><b>Replacement for <i>ad hoc</i> disk files</b></p>

<p>Many programs use 
fopen(),
fread(), and 
fwrite() to create and
manage files of data in home-grown formats. SQLite works 
particularly well as a
replacement for these <i>ad hoc</i> data files.
Contrary to intuition, SQLite can be faster than the filesystem
for reading and writing content to disk.
</p></li>

<li><p><b>Internal or temporary databases</b></p>

<p>
For programs that have a lot of data that must be sifted and sorted
in diverse ways, it is often easier and quicker to load the data into
an in-memory SQLite database and use queries with joins and ORDER BY
clauses to extract the data in the form and order needed rather than
to try to code the same operations manually.
Using an SQL database internally in this way also gives the program
greater flexibility since new columns and indices can be added without
having to recode every query.
</p>
</li>

<li><p><b>Stand-in for an enterprise database during demos or testing</b></p>

<p>
Client applications typically use a generic database interface that allows
connections to various SQL database engines. It makes good sense to 
include SQLite in the mix of supported databases and to statically
link the SQLite engine in with the client. That way the client program
can be used standalone with an SQLite data file for testing or for
demonstrations.
</p>
</li>

<li><p><b>Education and Training</b></p>

<p>
Because it is simple to setup and use (installation is trivial: just
copy the <b>sqlite3</b> or <b>sqlite3.exe</b> executable to the target machine
and run it) SQLite makes a good database engine for use'
|| ' in teaching SQL.
Students can easily create as many databases as they like and can
email databases to the instructor for comments or grading. For more
advanced students who are interested in studying how an RDBMS is
implemented, the modular and well-commented and documented SQLite code
can serve as a good basis.
</p>
</li>

<li><p><b>Experimental SQL language extensions</b></p>

<p>The simple, modular design of SQLite makes it a good platform for
prototyping new, experimental database language features or ideas.
</p>
</li>

</ul>

<h2>2. Situations Where A Client/Server RDBMS May Work Better</h2>

<ul>
<li><p><b>Client/Server Applications</b></p><p>If there are many client programs sending SQL to the same 
database over a network, then use a client/server database
engine instead of SQLite. SQLite will work over a network filesystem,
but because of the latency associated with most network filesystems,
performance will not be great. Also, file locking logic is buggy in
many network filesystem implementations (on both Unix and Windows).
If file locking does not work correctly,
two or more clients might try to modify the
same part of the same database at the same time, resulting in 
corruption. Because this problem results from bugs in
the underlying filesystem implementation, there is nothing SQLite
can do to prevent it.</p>

<p>A good rule of thumb is to avoid using SQLite
in situations where the same database will be accessed directly
(without an intervening application server) and simultaneously
from many computers over a network.</p>
</li>

<li><p><b>High-volume Websites</b></p>

<p>SQLite will normally work fine as the database backend to a website.
But if the website is write-intensive or is so busy that it requires
multiple servers, then consider using an enterpris'
|| 'e-class client/server 
database engine instead of SQLite.</p>
</li>

<li><p><b>Very large datasets</b></p>

<p>An SQLite database is limited in size to 281 terabytes 
(248 bytes, 256 tibibytes).
And even if it could handle larger databases, SQLite stores the entire
database in a single disk file and many filesystems limit the maximum
size of files to something less than this. So if you are contemplating
databases of this magnitude, you would do well to consider using a
client/server database engine that spreads its content across multiple
disk files, and perhaps across multiple volumes.
</p>
</li>

<li><p><b>High Concurrency</b></p>

<p>
SQLite supports an unlimited number of simultaneous readers, but it 
will only allow one writer at any instant in time.
For many situations, this is not a problem. Writers queue up. Each application
does its database work quickly and moves on, and no lock lasts for more
than a few dozen milliseconds. But there are some applications that require
more concurrency, and those applications may need to seek a different
solution.
</p>
</li>

</ul>

<h2>3. Checklist For Choosing The Right Database Engine</h2>

<ol>
<li><p><b>Is the data separated from the application by a network?
 &rarr; choose client/server</b></p>

<p>Relational database engines act as bandwidth-reducing data filters.
So it is best to keep the database engine and the data on
the same physical device so that the high-bandwidth engine-to-disk
link does not have to traverse the network, only the lower-bandwidth
application-to-engine link.

</p><p>But SQLite is built into the application. So if the data is on a
separate device from the application, it is required that the higher
bandwidth engine-to-disk link be across the network. This works, but
it is suboptimal. Hence, it is u'
|| 'sually better to select a client/server
database engine when the data is on a separate device from the
application.

</p><p><i>Nota Bene:</i>
In this rule, "application" means the code that issues SQL statements.
If the "application" is an application server and
if the content resides on the same physical machine as the application server,
then SQLite might still be appropriate even though the end user is
another network hop away.</p>
</li>

<li><p><b>Many concurrent writers? &rarr; choose client/server</b></p>

<p>If many threads and/or processes need to write the
database at the same instant (and they cannot queue up and take turns)
then it is best to select a database engine that supports that
capability, which always means a client/server database engine.

</p><p>SQLite only supports one writer at a time per database file.
But in most cases, a write transaction only takes milliseconds and
so multiple writers can simply take turns. SQLite will handle
more write concurrency than many people suspect. Nevertheless,
client/server database systems, because they have a long-running
server process at hand to coordinate access, can usually handle 
far more write concurrency than SQLite ever will.
</p></li>

<li><p><b>Big data? &rarr; choose client/server</b></p>

<p>If your data will grow to a size that you are uncomfortable
or unable to fit into a single disk file, then you should select
a solution other than SQLite. SQLite supports databases up to
281 terabytes in size, assuming you can find a disk drive and filesystem
that will support 281-terabyte files. Even so, when the size of the
content looks like it might creep into the terabyte range, it would
be good to consider a centralized client/server database.
</p></li>

<li><p><b>Otherwise &rarr; choose SQLite!</b></p>

<p'
|| '>For device-local storage with low writer concurrency and less than a
terabyte of content, SQLite is almost always a better solution. SQLite
is fast and reliable and it requires no configuration or maintenance.
It keeps things simple. SQLite "just works".
</p></li>
</ol>
<p><i>This page was last updated on 2025-05-31 13:08:22Z </i></p><div class="reprint">本文正文摘自 <b>sqlite.org 官方文档</b>（公有领域（Public Domain，SQLite 官方文档））。原文：<a href="https://www.sqlite.org/whentouse.html" target="_blank" rel="noopener">https://www.sqlite.org/whentouse.html</a>。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>','sqlite.org 官方文档','https://www.sqlite.org/whentouse.html','公有领域（Public Domain，SQLite 官方文档）',false,'38 分钟','转载自官方原文'),
('postgres-whatis','PostgreSQL 官方：PostgreSQL 是什么（PostgreSQL License 全文）','E','PostgreSQL 官方文档「What is PostgreSQL?」：关系型数据库定位、可扩展性与数据类型/函数/索引定制能力、MVCC 并发控制、SQL 标准符合度与 ACID 特性。','<div class="article-note"><b>来源：</b>postgresql.org 官方文档　·　<b>许可：</b>PostgreSQL License（PostgreSQL 官方文档）<br><b>原文链接：</b><a href="https://www.postgresql.org/docs/current/intro-whatis.html" target="_blank" rel="noopener">https://www.postgresql.org/docs/current/intro-whatis.html</a></div><div class="table-wrap"><table>
 <tr>
 <th>1. What Is PostgreSQL?</th>
 </tr>
 <tr>
 <td>Prev </td>
 <td>Up</td>
 <th>Preface</th>
 <td>Home</td>
 <td> Next</td>
 </tr>
 </table></div>
 

 
 
 
 <h2>1. What Is PostgreSQL? #</h2>
 
 
 
 <p>PostgreSQL is an object-relational database management system (ORDBMS) based on POSTGRES, Version 4.2, developed at the University of California at Berkeley Computer Science Department. POSTGRES pioneered many concepts that only became available in some commercial database systems much later.</p>
 <p>PostgreSQL is an open-source descendant of this original Berkeley code. It supports a large part of the SQL standard and offers many modern features:</p>
 
 <ul>
 <li>complex queries</li>
 <li>foreign keys</li>
 <li>triggers</li>
 <li>updatable views</li>
 <li>transactional integrity</li>
 <li>multiversion concurrency control</li>
 </ul>
 
 <p>Also, PostgreSQL can be extended by the user in many ways, for example by adding new</p>
 
 <ul>
 <li>data types</li>
 <li>functions</li>
 <li>operators</li>
 <li>aggregate functions</li>
 <li>index methods</li>
 <li>procedural languages</li>
 </ul>
 
 <p>And because of the liberal license, PostgreSQL can be used, modified, and distributed by anyone free of charge for any purpose, be it private, commercial, or academic.</p>

 
 <div class="table-wrap"><table>
 <tr>
 <td>Prev </td>
 <td>Up</td>
 <td> Next</td>
 </tr>
 <tr>
 <td>Preface </td>
 <td>Home</td>
 <td> 2. A Brief History of PostgreSQL</td>
 </tr>
 </table></div>'
|| '<div class="reprint">本文正文摘自 <b>postgresql.org 官方文档</b>（PostgreSQL License（PostgreSQL 官方文档））。原文：<a href="https://www.postgresql.org/docs/current/intro-whatis.html" target="_blank" rel="noopener">https://www.postgresql.org/docs/current/intro-whatis.html</a>。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>','postgresql.org 官方文档','https://www.postgresql.org/docs/current/intro-whatis.html','PostgreSQL License（PostgreSQL 官方文档）',false,'3 分钟','转载自官方原文'),
('k8s-components','Kubernetes 官方中文：集群组件架构（CC BY 4.0 全文）','D','Kubernetes 官方中文文档「Kubernetes 组件」：控制平面组件（kube-apiserver、etcd、kube-scheduler、kube-controller-manager、cloud-controller-manager）与 Node 组件（kubelet、kube-proxy、容器运行时）的职责与协作方式，以及插件（Addons）层。','<div class="article-note"><b>来源：</b>kubernetes.io 官方中文文档　·　<b>许可：</b>CC BY 4.0（Kubernetes 官方文档）<br><b>原文链接：</b><a href="https://kubernetes.io/zh-cn/docs/concepts/overview/components/" target="_blank" rel="noopener">https://kubernetes.io/zh-cn/docs/concepts/overview/components/</a></div><h2>Kubernetes 组件</h2>组成 Kubernetes 集群的关键组件概述。<p>本文档概述了一个正常运行的 Kubernetes 集群所需的各种组件。</p><p>Kubernetes 集群的组件</p><h2>核心组件 </h2><p>Kubernetes 集群由控制平面和一个或多个工作节点组成。以下是主要组件的简要概述：</p><h3>控制平面组件 </h3><p>这些控制平面组件（Control Plane Component）管理集群的整体状态：</p><dl><dt>kube-apiserver</dt><dd>公开 Kubernetes HTTP API 的核心组件服务器。</dd><dt>etcd</dt><dd>具备一致性和高可用性的键值存储，用于所有 API 服务器的数据存储。</dd><dt>kube-scheduler</dt><dd>查找尚未绑定到节点的 Pod，并将每个 Pod 分配给合适的节点。</dd><dt>kube-controller-manager</dt><dd>运行控制器来实现 Kubernetes API 行为。</dd><dt>cloud-controller-manager (optional)</dt><dd>与底层云驱动集成。</dd></dl><h3>Node 组件 </h3><p>在每个节点上运行，维护运行的 Pod 并提供 Kubernetes 运行时环境：</p><dl><dt>kubelet</dt><dd>确保 Pod 及其容器正常运行。</dd><dt>kube-proxy（可选）</dt><dd>维护节点上的网络规则以实现 Service 的功能。</dd><dt>容器运行时（Container runtime）</dt><dd>负责运行容器的软件，阅读容器运行时以了解更多信息。</dd></dl>&#128711; 本条目指向第三方项目或产品，而该项目（产品）不是 Kubernetes 的一部分。更多信息<p>你的集群可能需要每个节点上运行额外的软件；例如，你可能还需要在 Linux
节点上运行 systemd 来监督本地组件。</p><h2>插件（Addons） </h2><p>插件扩展了 Kubernetes 的功能。一些重要的例子包括：</p><dl><dt>DNS</dt><dd>集群范围内的 DNS 解析。</dd><dt>Web 界面（Dashboard）</dt><dd>通过 Web 界面进行集群管理。</dd><dt>容器资源监控</dt><dd>用于收集和存储容器指标。</dd><dt>集群层面日志</dt><dd>用于将容器日志保存到中央日志存储。</dd></dl><h2>架构灵活性 </h2><p>Kubernetes 允许灵活地部署和管理这些组件。此架构可以适应各种需求，从小型开发环境到大规模生产部署。</p><p>有关每个组件的详细信息以及配置集群架构的各种方法，
请参阅集群架构页面。</p><h2>反馈</h2><p>此页是否对你有帮助？</p>
<p>感谢反馈。如果你有一个关于如何使用 Kubernetes 的具体问题需要答案，可以访问
Stack Overflow.
如果需要，请在 GitHub 仓库 上登记新的问题
报告问题
或者
提出改进建议.</p>最后修改 June 18, 2026 at 11:33 AM PST: [zh-cn]sync overview/_index components (2ef2f60d15)<p>本页面中的条目引用了'
|| '第三方产品或项目，这些产品（项目）提供了 Kubernetes 所需的功能。Kubernetes 项目的开发人员不对这些第三方产品（项目）负责。请参阅CNCF 网站指南了解更多细节。</p><p>在提交更改建议，向本页添加新的第三方链接之前，你应该先阅读内容指南。</p><div class="reprint">本文正文摘自 <b>kubernetes.io 官方中文文档</b>（CC BY 4.0（Kubernetes 官方文档））。原文：<a href="https://kubernetes.io/zh-cn/docs/concepts/overview/components/" target="_blank" rel="noopener">https://kubernetes.io/zh-cn/docs/concepts/overview/components/</a>。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>','kubernetes.io 官方中文文档','https://kubernetes.io/zh-cn/docs/concepts/overview/components/','CC BY 4.0（Kubernetes 官方文档）',false,'3 分钟','转载自官方原文');
