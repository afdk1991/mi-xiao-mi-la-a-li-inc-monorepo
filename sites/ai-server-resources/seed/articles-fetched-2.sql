INSERT INTO articles (slug, title, category, summary, body, source, source_url, license, original, read_time, updated) VALUES
('archwiki-systemd','ArchWiki：systemd 系统与服务管理（GFDL 1.3 全文节选）','D','ArchWiki「systemd」条目：systemctl 基本用法、服务单元管理、target 与运行级别、日志（journalctl）、电源管理，以及编写自定义 service 单元的要点。','<div class="article-note"><b>来源：</b>ArchWiki（wiki.archlinux.org）　·　<b>许可：</b>GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可）<br><b>原文链接：</b><a href="https://wiki.archlinux.org/title/Systemd" target="_blank" rel="noopener">https://wiki.archlinux.org/title/Systemd</a></div><ul>
 <li>Home</li> <li>Packages</li> <li>Forums</li> <li>Wiki</li> <li>GitLab</li> <li>Security</li> <li>AUR</li> <li>Download</li> </ul>
 

Jump to content

 
 
 
 

 
 <b>ArchWiki</b>
 

 
 
 

 

Search
 
 
 
 
 
 

 
 

 
 
 <ul>
 
 
 </ul>
 
 

 

 
 
 <ul>
 <li>Create account
</li>
<li>Log in
</li>

 
 </ul>
 
 

 
 

 
 

Personal tools
 
 

 

 
 
 <ul>
 <li>

Create account
</li>
<li>

Log in
</li>

 
 </ul>
 
 

 
 

 
 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 <h2>systemd</h2>
 

 
 

11 languages
 
 

 
 
 <ul>
 
 <li>Deutsch</li><li>Español</li><li>Suomi</li><li>Français</li><li>Magyar</li><li>Italiano</li><li>日本語</li><li>Português</li><li>Русский</li><li>Türkçe</li><li>中文（简体）</li>
 </ul>
 
 

 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

 From ArchWiki
 
 
 
 
 
<p>Related articles</p><ul>
<li>systemd/User</li>
<li>systemd/Timers</li>
<li>systemd/Journal</li>
<li>systemd/Sandboxing</li>
<li>systemd/FAQ</li>
<li>init</li>
<li>udev</li>
<li>Improving performance/Boot process</li>
<li>Allow users to shutdown</li>
</ul>
<p>From the project web page:
</p>
<dl><dd><i>systemd</i> is a suite of basic building blocks for a Linux system. It provides a system and service manager that runs as PID 1 and starts the rest of the system. <i>systemd</i> provides aggressive parallelization capabilities, uses socket and D-Bus activation for starting services, offers on-demand starting of daemons, keeps track of processes using Linux control groups, maintains mount and automount points, and implements an elaborate transa'
|| 'ctional dependency-based service control logic. Other parts include a logging daemon, utilities to control basic system configuration like the hostname, date, locale, maintain a list of logged-in users and running containers and virtual machines, system accounts, runtime directories and settings, and daemons to manage simple network configuration, network time synchronization, log forwarding, and name resolution.</dd></dl>
<p>Historically, what systemd calls "service" was named daemon: any program that runs as a "background" process (without a terminal or user interface), commonly waiting for events to occur and offering services. A good example is a web server that waits for a request to deliver a page, or an ssh server waiting for someone trying to log in. While these are full featured applications, there are daemons whose work is not that visible. Daemons are for tasks like writing messages into a log file (e.g. <code>syslog</code>, <code>metalog</code>) or keeping your system time accurate (e.g. ntpd). For more information see daemon(7).
</p>
<b>Note</b> For a detailed explanation of why Arch moved to <i>systemd</i>, see this forum post.

<h2>Basic systemctl usage</h2>
<p>The main command used to introspect and control <i>systemd</i> is <i>systemctl</i>. Some of its uses are examining the system state and managing the system and services. See systemctl(1) for more details.
</p>
<b>Tip</b> 
<ul><li>You can use all of the following <i>systemctl</i> commands with the <code>-H <i>user</i>@<i>host</i></code> switch to control a <i>systemd</i> instance on a remote machine. This will use SSH to connect to the remote <i>systemd</i> instance.</li>
<li>Plasma users can install systemdgenie as a graphical frontend for <i>systemctl</i>.</li></ul>

<h3>Using units</h3>
<p>Units '
|| 'commonly include, but are not limited to, services (<i>.service</i>), mount points (<i>.mount</i>), devices (<i>.device</i>) and sockets (<i>.socket</i>).
</p><p>When using <i>systemctl</i>, you generally have to specify the complete name of the unit file, including its suffix, for example <code>sshd.socket</code>. There are however a few short forms when specifying the unit in the following <i>systemctl</i> commands:
</p>
<ul><li>If you do not specify the suffix, systemctl will assume <i>.service</i>. For example, <code>netctl</code> and <code>netctl.service</code> are equivalent.</li>
<li>Mount points will automatically be translated into the appropriate <i>.mount</i> unit. For example, specifying <code>/home</code> is equivalent to <code>home.mount</code>.</li>
<li>Similar to mount points, devices are automatically translated into the appropriate <i>.device</i> unit, therefore specifying <code>/dev/sda2</code> is equivalent to <code>dev-sda2.device</code>.</li></ul>
<p>See systemd.unit(5) for details.
</p>
<b>Note</b> Some unit names contain an <code>@</code> sign (e.g. <code>name@<i>string</i>.service</code>): this means that they are instances of a <i>template</i> unit, whose actual file name does not contain the <code><i>string</i></code> part (e.g. <code>name@.service</code>). <code><i>string</i></code> is called the <i>instance identifier</i>, and is similar to an argument that is passed to the template unit when called with the <i>systemctl</i> command: in the unit file it will substitute the <code>%i</code> specifier. To be more accurate, <i>before</i> trying to instantiate the <code>name@.<i>suffix</i></code> template unit, <i>systemd</i> will actually look for a unit with the exact <code>name@<i>string</i>.<i>suffix</i></code> file name, although by conventi'
|| 'on such a "clash" happens rarely, i.e. most unit files containing an <code>@</code> sign are meant to be templates. Also, if a template unit is called without an instance identifier, it will generally fail (except with certain <i>systemctl</i> commands, like <code>cat</code>).
<p>The commands in the below table operate on <b>system units</b> since <code>--system</code> is the implied default for <i>systemctl</i>. To instead operate on <b>user units</b> (for the <i>calling user</i>), use systemctl --user without root privileges. See also systemd/User#Basic setup to enable/disable user units for <i>all users</i>.
</p>
<b>Tip</b> 
<ul><li>Most commands also work if multiple units are specified, see systemctl(1) for more information.</li>
<li>The <code>--now</code> switch can be used in conjunction with <code>enable</code>, <code>disable</code>, and <code>mask</code> to start or stop the unit <i>immediately</i> rather than after rebooting.</li>
<li>A package may offer units for different purposes. If you just installed a package, <code>pacman -Qql <i>package</i> | grep -Fe .service -e .socket</code> can be used to check and find them.</li>
<li>When available, enabling <code><i>unit</i>.socket</code> instead of <code><i>unit</i>.service</code> might be beneficial because the socket would start the service when necessary. See #Socket activation for more details.</li>
<li>A search <i>pattern</i> can be appended to a lot of commands, making the use of <i>grep</i> unnecessary. For example, you can search the manual by executing <code>systemctl help ''<i>dbus*</i>''</code>, or list specific units with <code>systemctl list-units ''<i>dbus*</i>''</code>.</li></ul>

<div class="table-wrap"><table>
<tbody><tr>
<th>Action</th>
<th>Command</th>
<th>Note
</th></tr>
<tr>
<th>Analyzing th'
|| 'e system state
</th></tr>
<tr>
<td><b>Show system status</b></td>
<td><code>systemctl status</code></td>
</tr>
<tr>
<td><b>List running</b> units</td>
<td><code>systemctl</code> or<br><code>systemctl list-units</code></td>
</tr>
<tr>
<td><b>List failed</b> units</td>
<td><code>systemctl --failed</code></td>
</tr>
<tr>
<td><b>List installed</b> unit files1</td>
<td><code>systemctl list-unit-files</code></td>
</tr>
<tr>
<td><b>Show process status</b> for a PID</td>
<td><code>systemctl status <i>pid</i></code></td>
<td>cgroup slice, memory and parent
</td></tr>
<tr>
<th>Checking the unit status
</th></tr>
<tr>
<td><b>Show a manual page</b> associated with a unit</td>
<td><code>systemctl help <i>unit</i></code></td>
<td>as supported by the unit
</td></tr>
<tr>
<td><b>Status</b> of a unit</td>
<td><code>systemctl status <i>unit</i></code></td>
<td>including whether it is running or not
</td></tr>
<tr>
<td><b>Check</b> whether a unit is enabled</td>
<td><code>systemctl is-enabled <i>unit</i></code></td>
</tr>
<tr>
<th>Starting, restarting, reloading a unit
</th></tr>
<tr>
<td><b>Start</b> a unit immediately</td>
<td><code>systemctl start <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Stop</b> a unit immediately</td>
<td><code>systemctl stop <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Restart</b> a unit</td>
<td><code>systemctl restart <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Reload</b> a unit and its configuration</td>
<td><code>systemctl reload <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Reload systemd manager</b> configuration2</td>
<td><code>systemctl daemon-reload</code> as root</td>
<td>scan for new or changed units
</td></tr>
<tr>
<th>Enabling a unit
</th></tr>
<tr>
<td><b>Enable</b> a unit to start automatically at boot</td>
<td><code>systemctl '
|| 'enable <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Enable</b> a unit to start automatically at boot and <b>start</b> it immediately</td>
<td><code>systemctl enable --now <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Disable</b> a unit to no longer start at boot</td>
<td><code>systemctl disable <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Disable</b> a unit to no longer start at boot and <b>stop</b> it immediately</td>
<td><code>systemctl disable --now <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Reenable</b> a unit3</td>
<td><code>systemctl reenable <i>unit</i></code> as root</td>
<td>i.e. disable and enable anew
</td></tr>
<tr>
<th>Masking a unit
</th></tr>
<tr>
<td><b>Mask</b> a unit to make it impossible to start4</td>
<td><code>systemctl mask <i>unit</i></code> as root</td>
</tr>
<tr>
<td><b>Unmask</b> a unit</td>
<td><code>systemctl unmask <i>unit</i></code> as root</td>
</tr></tbody></table></div>
<ol><li>See systemd.unit(5)&#32;§&#8239;UNIT FILE LOAD PATH for the directories where available unit files can be found.</li>
<li>This does not ask the changed units to reload their own configurations (see the <b>Reload</b> action).</li>
<li>For example, in case its <code>[Install]</code> section has changed since last enabling it.</li>
<li>Both manually and as a dependency, which makes masking dangerous. Check for existing masked units with: <pre>$ systemctl list-unit-files --state=masked</pre></li></ol>
<h3>Power management</h3>
<p>polkit is necessary for power management as an unprivileged user. If you are in a local <i>systemd-logind</i> user session and no other session is active, the following commands will work without root privileges. If not (for example, because another user is logged into a tty), <i>systemd</i> will automatically ask you for'
|| ' the root password.
</p>
<div class="table-wrap"><table>
<tbody><tr>
<th>Action</th>
<th>Command
</th></tr>
<tr>
<td>Shut down and reboot the system</td>
<td><code>systemctl reboot</code>
</td></tr>
<tr>
<td>Shut down and power-off the system</td>
<td><code>systemctl poweroff</code>
</td></tr>
<tr>
<td>Suspend the system</td>
<td><code>systemctl suspend</code>
</td></tr>
<tr>
<td>Put the system into hibernation (write RAM to disk)</td>
<td><code>systemctl hibernate</code>
</td></tr>
<tr>
<td>Put the system into hybrid-sleep state (also called suspend-to-both, it saves RAM to disk and then suspends)</td>
<td><code>systemctl hybrid-sleep</code>
</td></tr>
<tr>
<td>First suspend the system, then wake up after a configured time in order to just hibernate the system</td>
<td><code>systemctl suspend-then-hibernate</code>
</td></tr>
<tr>
<td>Perform a reboot of the userspace-only with a #Soft reboot.</td>
<td><code>systemctl soft-reboot</code>
</td></tr>
</tbody></table></div>
<h3>Soft reboot</h3>
<p>Soft reboot is a special kind of a userspace-only reboot operation that does not involve the kernel. It is implemented by systemd-soft-reboot.service(8) and can be invoked through <code>systemctl soft-reboot</code>. As with kexec, it skips firmware re-initialization, but additionally the system does not go through kernel initialization and initramfs, and unlocked dm-crypt devices remain attached.
</p><p>When <code>/run/nextroot/</code> contains a valid root file system hierarchy (e.g. is the root mount of another distribution or another snapshot), <i>soft-reboot</i> would switch the system root into it, allowing for switching to another installation without losing states managed by kernel, e.g. networking.
</p>
<b>Tip</b> <code>/run/nextroot/</code> is not necessarily a mount poin'
|| 't or backed by physical device. For example, it can reside in the <code>/run/</code> tmpfs. <i>systemd</i> will turn <code>/run/nextroot/</code> automatically into a mount point on <i>soft-reboot</i>.
<b>Note</b> Do not invoke <code>systemctl soft-reboot</code> after package updates that involved the kernel and initramfs.
<h2>Writing unit files</h2>
<p>The syntax of <i>systemd''</i>s unit files (systemd.unit(5)) is inspired by XDG Desktop Entry Specification .desktop files, which are in turn inspired by Microsoft Windows .ini files. Unit files are loaded from multiple locations (to see the full list, run <code>systemctl show --property=UnitPath</code>), but the main ones are (listed from lowest to highest precedence):
</p>
<ul><li><code>/usr/lib/systemd/system/</code>: units provided by installed packages</li>
<li><code>/run/systemd/system/</code>: units installed by the system administrator, deleted on power-off (useful for #Editing provided units)</li>
<li><code>/etc/systemd/system/</code>: units installed by the system administrator</li></ul>
<b>Note</b> 
<ul><li>The load paths are completely different when running <i>systemd</i> in user mode.</li>
<li><i>systemd</i> unit names may only contain ASCII alphanumeric characters, underscores and periods. All other characters must be replaced by C-style "\x2d" escapes, or employ their predefined semantics (''@'', ''-''). See systemd.unit(5) and systemd-escape(1) for more information.</li></ul>

<p>Look at the units installed by your packages for examples, as well as systemd.service(5)&#32;§&#8239;EXAMPLES.
</p>
<b>Tip</b> Comments prepended with <code>#</code> may be used in unit-files as well, but only in new lines. Do not use end-line comments after <i>systemd</i> parameters or the unit will fail to activate.
<p>To inspe'
|| 'ct or verify the work, systemd-analyze(1) can help with the <code>cat-config</code> or <code>verify</code> command.
</p>
<h3>Handling dependencies</h3>
<p>With <i>systemd</i>, dependencies can be resolved by designing the unit files correctly. The most typical case is when unit <i>A</i> requires unit <i>B</i> to be running before <i>A</i> is started. In that case add <code>Requires=<i>B</i></code> and <code>After=<i>B</i></code> to the <code>[Unit]</code> section of <i>A</i>. If the dependency is optional, add <code>Wants=<i>B</i></code> and <code>After=<i>B</i></code> instead. Note that <code>Wants=</code> and <code>Requires=</code> do not imply <code>After=</code>, meaning that if <code>After=</code> is not specified, the two units will be started in parallel.
</p><p>Dependencies are typically placed on services and not on #Targets. For example, <code>network.target</code> is pulled in by whatever service configures your network interfaces, therefore ordering your custom unit after it is sufficient since <code>network.target</code> is started anyway.
</p>
<h3>Service types</h3>
<p>There are several different start-up types to consider when writing a custom service file. This is set with the <code>Type=</code> parameter in the <code>[Service]</code> section:
</p>
<ul><li><code>Type=simple</code> (default): <i>systemd</i> considers the service to be started up immediately. The process must not fork. Do not use this type if other services need to be ordered on this service, unless it is socket activated.</li>
<li><code>Type=forking</code>: <i>systemd</i> considers the service started up once the process forks and the parent has exited. For classic daemons, use this type unless you know that it is not necessary. You should specify <code>PIDFile=</code> as well so <i>syste'
|| 'md</i> can keep track of the main process.</li>
<li><code>Type=oneshot</code>: this is useful for scripts that do a single job and then exit. You may want to set <code>RemainAfterExit=yes</code> as well so that <i>systemd</i> still considers the service as active after the process has exited. Setting <code>RemainAfterExit=yes</code> is appropriate for the units which change the system state (e.g., mount some partition). See also [1] for the differences of simple and oneshot.</li>
<li><code>Type=notify</code>: identical to <code>Type=simple</code>, but with the stipulation that the daemon will send a signal to <i>systemd</i> when it is ready. The reference implementation for this notification is provided by <i>libsystemd-daemon.so</i>.</li>
<li><code>Type=dbus</code>: the service is considered ready when the specified <code>BusName</code> appears on DBus''s system bus.</li>
<li><code>Type=idle</code>: <i>systemd</i> will delay execution of the service binary until all jobs are dispatched unless these take longer than 5s, where the service binary is started anyway. Other than that its behaviour is very similar to <code>Type=simple</code>. It should never be used for service ordering and is intended for helping with console output readability.</li></ul>
<p>See the systemd.service(5)&#32;§&#8239;OPTIONS man page for a more detailed explanation of the <code>Type</code> values.
</p>
<h3>Editing provided units</h3>

<p><b>This article or section needs expansion.</b></p>
<b>Reason:</b> We should fit "If <code>--runtime</code> is specified, the changes will be made temporarily in <code>/run/</code> and they will be lost on the next reboot." in here. An example would be passing debug flags to a service and not wanting to keep the changes permanently. (Discuss in Talk:Systemd)

<p'
|| '>To avoid conflicts with pacman, unit files provided by packages should not be directly edited. There are two safe ways to modify a unit without touching the original file: create a new unit file which overrides the original unit or create drop-in snippets which are applied on top of the original unit. For both methods, you must reload the unit afterwards to apply your changes. This can be done either by editing the unit with <code>systemctl edit</code> (which reloads the unit automatically) or by reloading all units with:
</p>
<pre># systemctl daemon-reload
</pre>
<b>Tip</b> 
<ul><li>You can use <i>systemd-delta</i> to see which unit files have been overridden or extended and what exactly has been changed.</li>
<li>Use <code>systemctl cat <i>unit</i></code> to view the content of a unit file and all associated drop-in snippets.</li></ul>

<h3>Replacement unit files</h3>
<b>Note</b> The replacement units will keep on being used even if Pacman updates the original units in the future. This method makes system maintenance more difficult and therefore the next approach is preferred.
<p>To replace the unit file <code>/usr/lib/systemd/system/<i>unit</i></code>, create the file <code>/etc/systemd/system/<i>unit</i></code> and reenable the unit to update the symlinks.
</p><p>Alternatively, run:
</p>
<pre># systemctl edit --full <i>unit</i>
</pre>
<p>This opens <code>/etc/systemd/system/<i>unit</i></code> in your editor (copying the installed version if it does not exist yet) and automatically reloads it when you finish editing.
</p>
<h3>Drop-in files</h3>
<p>To create drop-in files for the unit file <code>/usr/lib/systemd/system/<i>unit</i></code>, create the directory <code>/etc/systemd/system/<i>unit</i>.d/</code> and place <i>.conf</i> files there to override or add new opt'
|| 'ions. Drop-in directories must always include the full unit name, including its extension like <code>.service</code>, <code>.socket</code>, or <code>.timer</code>, followed by <code>.d</code>. <i>systemd</i> will parse and apply these files on top of the original unit.
</p><p>The easiest way to do this is to run:
</p>
<pre># systemctl edit <i>unit</i> --drop-in=<i>drop_in_name</i>
</pre>
<p>This opens the file <code>/etc/systemd/system/<i>unit</i>.d/<i>drop_in_name</i>.conf</code> in your text editor (creating it if necessary) and automatically reloads the unit when you are done editing.
Omitting the <code>--drop-in=</code> option will result in systemd using the default file name <code>override.conf</code> .
</p>
<b>Note</b> 
<ul><li>The key must be still placed in the appropriate section in the override file.</li>
<li>Not all keys can be overridden with drop-in files. For example, for changing <code>Conflicts=</code> a replacement file is necessary.</li>
<li>You can use top-level drop-in files to affect all units of the same type. For example, a drop-in file in <code>/etc/systemd/system/service.d/</code> affects all <i>.service</i> units. You can see an example in #Notifying about failed services</li></ul>

<h3>Revert to vendor version</h3>
<p>To revert any changes to a unit made using <code>systemctl edit</code> do:
</p>
<pre># systemctl revert <i>unit</i>
</pre>
<h3>Examples</h3>
<p>For example, if you simply want to add an additional dependency to a unit, you may create the following file:
</p>
<pre>/etc/systemd/system/<i>unit</i>.d/customdependency.conf</pre>
<pre>[Unit]
Requires=<i>new dependency</i>
After=<i>new dependency</i></pre>
<p>As another example, in order to replace the <code>ExecStart</code> directive, create the following file:
</p>
<pre>/etc/systemd/'
|| 'system/<i>unit</i>.d/customexec.conf</pre>
<pre>[Service]
ExecStart=
ExecStart=<i>new command</i></pre>
<p>Note how <code>ExecStart</code> must be cleared before being re-assigned [2]. The same holds for every item that can be specified multiple times, e.g. <code>OnCalendar</code> for timers.
</p><p>One more example to automatically restart a service:
</p>
<pre>/etc/systemd/system/<i>unit</i>.d/restart.conf</pre>
<pre>[Service]
Restart=always
RestartSec=30</pre>
<h3>Service logging levels</h3>
<p>For services that send logs directly to journald or syslog, you can control their verbosity by setting a numeric value between 0 and 6 for the <code>LogLevelMax=</code> parameter in the <code>[Service]</code> section using the methods described above. For example:
</p>
<pre>/etc/systemd/system/<i>unit</i>.d/override.conf</pre>
<pre>[Service]
LogLevelMax=3</pre>
<p>The standard log levels are identical to those used to filter the journal. Setting a lower number excludes all higher and less important log messages from your journal.
</p>
<h3>Suppressing a service''s standard output</h3>
<p>If a service is echoing stdout and/or stderr output, by default this will end up in the journal as well. This behavior can be suppressed by setting <code>StandardOutput=null</code> and/or <code>StandardError=null</code> in the <code>[Service]</code> section. Other values than <code>null</code> can be used to further tweak this behavior. See systemd.exec(5)&#32;§&#8239;LOGGING_AND_STANDARD_INPUT/OUTPUT.
</p>
<h2>Targets</h2>
<p><i>systemd</i> uses <i>targets</i> to group units together via dependencies and as standardized synchronization points. They serve a similar purpose as runlevels but act a little differently. Each <i>target</i> is named instead of numbered and is intended to serve a specif'
|| 'ic purpose with the possibility of having multiple ones active at the same time. Some <i>target</i>s are implemented by inheriting all of the services of another <i>target</i> and adding additional services to it. There are <i>systemd</i> <i>target</i>s that mimic the common SystemVinit runlevels.
</p>
<h3>Get current targets</h3>
<p>The following should be used under <i>systemd</i> instead of running <code>runlevel</code>:
</p>
<pre>$ systemctl list-units --type=target
</pre>
<h3>Create custom target</h3>
<p>The runlevels that held a defined meaning under sysvinit (i.e., 0, 1, 3, 5, and 6); have a 1:1 mapping with a specific <i>systemd</i> <i>target</i>. Unfortunately, there is no good way to do the same for the user-defined runlevels like 2 and 4. If you make use of those it is suggested that you make a new named <i>systemd</i> <i>target</i> as <code>/etc/systemd/system/<i>your target</i></code> that takes one of the existing runlevels as a base (you can look at <code>/usr/lib/systemd/system/graphical.target</code> as an example), make a directory <code>/etc/systemd/system/<i>your target</i>.wants</code>, and then symlink the additional services from <code>/usr/lib/systemd/system/</code> that you wish to enable.
</p>
<h3>Mapping between SysV runlevels and systemd targets</h3>
<div class="table-wrap"><table>
<tbody><tr>
<th>SysV Runlevel</th>
<th>systemd Target</th>
<th>Notes
</th></tr>
<tr>
<td>0</td>
<td>poweroff.target</td>
<td>Halt the system.
</td></tr>
<tr>
<td>1, s, single</td>
<td>rescue.target</td>
<td>Single user mode.
</td></tr>
<tr>
<td>2, 4</td>
<td>multi-user.target</td>
<td>User-defined/Site-specific runlevels. By default, identical to 3.
</td></tr>
<tr>
<td>3</td>
<td>multi-user.target</td>
<td>Multi-user, non-graphical. Users can usually login via mult'
|| 'iple consoles or via the network.
</td></tr>
<tr>
<td>5</td>
<td>graphical.target</td>
<td>Multi-user, graphical. Usually has all the services of runlevel 3 plus a graphical login.
</td></tr>
<tr>
<td>6</td>
<td>reboot.target</td>
<td>Reboot
</td></tr>
<tr>
<td>emergency</td>
<td>emergency.target</td>
<td>Emergency shell
</td></tr>
</tbody></table></div>
<h3>Change current target</h3>
<p>In <i>systemd</i>, targets are exposed via <i>target units</i>. You can change them like this:
</p>
<pre># systemctl isolate graphical.target
</pre>
<p>This will only change the current target, and has no effect on the next boot. This is equivalent to commands such as <code>telinit 3</code> or <code>telinit 5</code> in Sysvinit.
</p>
<h3>Change default target to boot into</h3>
<p>The standard target is <code>default.target</code>, which is a symlink to <code>graphical.target</code>. This roughly corresponds to the old runlevel 5.
</p><p>To verify the current target with <i>systemctl</i>:
</p>
<pre>$ systemctl get-default
</pre>
<p>To change the default target to boot into, change the <code>default.target</code> symlink. With <i>systemctl</i>:
</p>
<pre># systemctl set-default multi-user.target</pre>
<pre>Removed /etc/systemd/system/default.target.
Created symlink /etc/systemd/system/default.target -&gt; /usr/lib/systemd/system/multi-user.target.</pre>
<p>Alternatively, append one of the following kernel parameters to your boot loader:
</p>
<ul><li><code>systemd.unit=multi-user.target</code> (which roughly corresponds to the old runlevel 3),</li>
<li><code>systemd.unit=rescue.target</code> (which roughly corresponds to the old runlevel 1).</li></ul>
<h3>Default target order</h3>
<p><i>systemd</i> chooses the <code>default.target</code> according to the following order:
</p>
<ol><li>Kerne'
|| 'l parameter shown above</li>
<li>Symlink of <code>/etc/systemd/system/default.target</code></li>
<li>Symlink of <code>/usr/lib/systemd/system/default.target</code></li></ol>
<h2>systemd components</h2>
<p>Some (not exhaustive) components of <i>systemd</i> are:
</p>
<ul><li>kernel-install — to automatically move kernels and their respective initramfs images to the boot partition;</li>
<li>systemd-analyze(1) — may be used to determine boot-up performance, statistics and retrieve other state and tracing information, and to verify the correctness of unit files. It is also used to access special functions useful for advanced debugging.</li>
<li>systemd-boot — simple UEFI boot manager;</li>
<li>systemd-creds — to securely store and retrieve credentials used by systemd units;</li>
<li>systemd-cryptenroll — Enroll PKCS#11, FIDO2, TPM2 token/devices to LUKS2 encrypted volumes;</li>
<li>systemd-firstboot — basic system setting initialization before first boot;</li>
<li>systemd-homed — portable human-user accounts;</li>
<li>systemd-logind(8) — session management;</li>
<li>systemd-networkd — network configuration management;</li>
<li>systemd-nspawn — light-weight namespace container;</li>
<li>systemd-repart — creates partition tables, adds or grows partitions;</li>
<li>systemd-resolved — network name resolution;</li>
<li>systemd-run(1) / run0 — Temporarily and interactively acquire elevated or different privileges.</li>
<li>systemd-stub(7) — a UEFI boot stub used for creating unified kernel images;</li>
<li>systemd-sysusers(8) — creates system users and groups and adds users to groups at package installation or boot time;</li>
<li>systemd-timesyncd — system time synchronization across the network;</li>
<li>systemd/Journal — system logging;</li>
<li>systemd/Timers — monotonic or rea'
|| 'ltime timers for controlling <i>.service</i> files or events, reasonable alternative to cron.</li></ul>
<h3>systemd.mount - mounting</h3>
<p><i>systemd</i> is in charge of mounting the partitions and filesystems specified in <code>/etc/fstab</code>. The systemd-fstab-generator(8) translates all the entries in <code>/etc/fstab</code> into <i>systemd</i> units; this is performed at boot time and whenever the configuration of the system manager is reloaded.
</p><p><i>systemd</i> extends the usual fstab capabilities and offers additional mount options. These affect the dependencies of the mount unit. They can, for example, ensure that a mount is performed only once the network is up or only once another partition is mounted. The full list of specific <i>systemd</i> mount options, typically prefixed with <code>x-systemd.</code>, is detailed in systemd.mount(5)&#32;§&#8239;FSTAB.
</p><p>An example of these mount options is <i>automounting</i>, which means mounting only when the resource is required rather than automatically at boot time. This is provided in fstab#Automount with systemd.
</p>
<h3>GPT partition automounting</h3>
<p>On UEFI-booted systems, GPT partitions such as <code>root</code>, <code>home</code>, <code>swap</code>, etc. can be mounted automatically following the Discoverable Partitions Specification. These partitions can thus be omitted from fstab, and if the root partition is automounted, then <code>root=</code> can be omitted from the kernel command line. See systemd-gpt-auto-generator(8).
</p><p>The prerequisites are:
</p>
<ul><li>When using mkinitcpio, the systemd hook is required to automount the <code>root</code> partition.</li>
<li>All automounted partitions must reside on the same physical disk as the ESP.</li>
<li>The correct GPT partition types must'
|| ' be set. See Partitioning#Partition scheme.</li>
<li>The boot loader must set the LoaderDevicePartUUID EFI variable, so that the used EFI system partition can be identified. This is supported by systemd-boot, systemd-stub(7), Limine, GRUB (with <i>grub-mkconfig</i> generated <code>grub.cfg</code>; custom <code>grub.cfg</code> requires loading the bli module) and rEFInd (not enabled by default). This can be verified by running <code>bootctl</code> and checking if there is a line with <code>Partition:</code> under <code>Current Boot Loader</code> or <code>Current Stub</code> when booting via Unified kernel images.</li></ul>
<p><i>udev</i> will create symlinks to the discovered partitions which can be used to reference the partitions and volumes in configuration files.
</p>
<b>Tip</b> The automounting of a partition can be disabled by changing the partition''s type GUID or setting the partition attribute bit 63 "do not automount", see gdisk#Prevent GPT partition automounting.
<h3>/var</h3>
<p>For <code>/var</code> automounting to work, the PARTUUID must match the SHA256 HMAC hash of the partition type UUID keyed by the machine ID. The required PARTUUID can be obtained using:
</p>
<pre>$ systemd-id128 -u var-partition-uuid
</pre>
<b>Note</b> systemd-id128(1) reads the machine ID from <code>/etc/machine-id</code>, this makes it impossible to know the needed PARTUUID before the system is installed.
<h3>systemd-sysvcompat</h3>
<p>The primary role of systemd-sysvcompat (required by base) is to provide the traditional linux init binary. For <i>systemd</i>-controlled systems, <code>init</code> is just a symbolic link to its <code>systemd</code> executable.
</p><p>In addition, it provides four convenience shortcuts that SysVinit users might be used to. The convenience shortcuts ar'
|| 'e halt(8), poweroff(8), reboot(8) and shutdown(8). Each one of those four commands is a symbolic link to <code>systemctl</code>, and is governed by <i>systemd</i> behavior. Therefore, the discussion at #Power management applies.
</p><p><i>systemd</i>-based systems can give up those System V compatibility methods by using the <code>init=</code> boot parameter (see, for example, /bin/init is in systemd-sysvcompat&#160;?) and <i>systemd</i> native <code>systemctl</code> command arguments.
</p>
<h3>systemd-tmpfiles - temporary files</h3>
<p><i>systemd-tmpfiles</i> creates, deletes and cleans up volatile and temporary files and directories. It reads configuration files in <code>/etc/tmpfiles.d/</code> and <code>/usr/lib/tmpfiles.d/</code> to discover which actions to perform. Configuration files in the former directory take precedence over those in the latter directory.
</p><p>Configuration files are usually provided together with service files, and they are named in the style of <code>/usr/lib/tmpfiles.d/<i>program</i>.conf</code>. For example, the Samba daemon expects the directory <code>/run/samba</code> to exist and to have the correct permissions. Therefore, the samba package ships with this configuration:
</p>
<pre>/usr/lib/tmpfiles.d/samba.conf</pre>
<pre>D /run/samba 0755 root root
</pre>
<p>Configuration files may also be used to write values into certain files on boot. For example, if you used <code>/etc/rc.local</code> to disable wakeup from USB devices with <code>echo USBE &gt; /proc/acpi/wakeup</code>, you may use the following tmpfile instead:
</p>
<pre>/etc/tmpfiles.d/disable-usb-wake.conf</pre>
<pre># Path Mode UID GID Age Argument
w! /proc/acpi/wakeup - - - - USBE
</pre>
<p>An exclamation mark <code>!</code> signifies that the line is only applied at boot. T'
|| 'his will prevent re-enabling the wakeup trigger if systemd-tmpfiles is run again after boot (for example by the pacman hook).
</p><p>It is possible to write multiple lines to the same file, either with <code>\n</code> in the argument or using the <code>w+</code> type on multiple lines (including the first one) for <i>appending</i>:
</p>
<pre>/etc/tmpfiles.d/disable-usb-wake.conf</pre>
<pre># Path Mode UID GID Age Argument
w+! /proc/acpi/wakeup - - - - USBE
w+! /proc/acpi/wakeup - - - - LID0
</pre>
<p>See the systemd-tmpfiles(8) and tmpfiles.d(5) man pages for details.
</p>
<b>Note</b> This method may not work to set options in <code>/sys</code> since the <i>systemd-tmpfiles-setup</i> service may run before the appropriate device modules are loaded. In this case, you could check whether the module has a parameter for the option you want to set with <code>modinfo <i>module</i></code> and set this option with a config file in /etc/modprobe.d. Otherwise, you will have to write a udev rule to set the appropriate attribute as soon as the device appears.
<h3>Drop-in configuration files</h3>

<p><b>The factual accuracy of this article or section is disputed.</b></p>
<b>Reason:</b> This page is about PID 1 (init), and unit drop-ins are already mentioned. Drop-in is a generic concept, plus other systemd components have their dedicated wiki pages. Therefore this section doesn''t seem to belong here. (Discuss in Talk:Systemd#YHNdnzj&#160;: Configuration files in conf.d / drop-in snippets: misplaced?)

<p>Configuration files provided by packages should not be directly edited to avoid conflicts with pacman updates. For this, many (but not all) systemd packages provide a way to modify the configuration, but without touching the original file by creation of drop-in snippets. Check the '
|| 'package manual to see if drop-in configuration files are supported.
</p><p>To create a drop-in configuration file for the unit file <code>/etc/systemd/<i>unit</i>.conf</code>, create the directory <code>/etc/systemd/<i>unit</i>.conf.d/</code> and place <i>.conf</i> files there to override or add new options. <i>systemd</i> will parse and apply these files on top of the original unit.
</p><p>Check the overall configuration:
</p>
<pre>$ systemd-analyze cat-config systemd/<i>unit</i>.conf
</pre>
<p>The applied drop-in snippets file(s) and content will be listed at the end. Restart the service for the changes to take effect.
</p>
<h2>Tips and tricks</h2>
<h3>Socket activation</h3>
<p>Some packages provide a <i>.socket</i> unit. For example, cups provides a <code>cups.socket</code> unit[3]. If <code>cups.socket</code> is enabled (and <code>cups.service</code> is left disabled), <i>systemd</i> will not start CUPS immediately; it will just listen to the appropriate sockets. Then, whenever a program attempts to connect to one of these CUPS sockets, <i>systemd</i> will start <code>cups.service</code> and transparently hand over control of these ports to the CUPS process.
</p>
<h3>GUI configuration tools</h3>
<ul><li><b>SysD Manager</b> &#8212; A systemd GUI to manage service, timer, socket and other units.</li></ul>
<dl><dd>https://github.com/plrigaux/sysd-manager || sysd-managerAUR</dd></dl>
<ul><li><b>systemadm</b> &#8212; Graphical browser for <i>systemd</i> units. It can show the list of units, possibly filtered by type.</li></ul>
<dl><dd>https://github.com/systemd/systemd-ui || systemd-ui</dd></dl>
<ul><li><b>systemdGenie</b> &#8212; <i>systemd</i> management utility based on KDE technologies.</li></ul>
<dl><dd>https://apps.kde.org/systemdgenie/ || systemdgenie</dd></dl>
<u'
|| 'l><li><b>isd</b> &#8212; TUI for working with <i>systemd</i> units.</li></ul>
<dl><dd>https://github.com/kainctl/isd || isd</dd></dl>
<h3>Running services after the network is up</h3>
<p>To delay a service until after the network is up, include the following dependencies in the <i>.service</i> file:
</p>
<pre>/etc/systemd/system/<i>foo</i>.service</pre>
<pre>[Unit]
...
Wants=network-online.target
After=network-online.target
...</pre>
<p>The network wait service of the network manager in use must also be enabled so that <code>network-online.target</code> properly reflects the network status.
</p>
<ul><li>If using NetworkManager, <code>NetworkManager-wait-online.service</code> should be enabled together with <code>NetworkManager.service</code>. Check if this is the case with <code>systemctl is-enabled NetworkManager-wait-online.service</code>. If it is not enabled, then reenable <code>NetworkManager.service</code>.</li>
<li>In the case of netctl, enable the <code>netctl-wait-online.service</code> (unless you are using <i>netctl-auto</i>; see FS#75836).</li>
<li>If using systemd-networkd, <code>systemd-networkd-wait-online.service</code> should be enabled together with <code>systemd-networkd.service</code>. Check if this is the case with <code>systemctl is-enabled systemd-networkd-wait-online.service</code>. If it is not enabled, then reenable <code>systemd-networkd.service</code>.</li></ul>
<p>For more detailed explanations, see the discussion in the Network configuration synchronization points.
</p><p>If a service needs to perform DNS queries, it should additionally be ordered after <code>nss-lookup.target</code>:
</p>
<pre>/etc/systemd/system/<i>foo</i>.service</pre>
<pre>[Unit]
...
Wants=network-online.target
After=network-online.target nss-lookup.target
...</pre>
<p>S'
|| 'ee systemd.special(7)&#32;§&#8239;Special Passive System Units.
</p><p>For <code>nss-lookup.target</code> to have any effect it needs a service that pulls it in via <code>Wants=nss-lookup.target</code> and orders itself before it with <code>Before=nss-lookup.target</code>. Typically this is done by local DNS resolvers.
</p><p>Check which active service, if any, is pulling in <code>nss-lookup.target</code> with:
</p>
<pre>$ systemctl list-dependencies --reverse nss-lookup.target
</pre>
<h3>Enable installed units by default</h3>

<p><b>This article or section needs expansion.</b></p>
<b>Reason:</b> How does it work with instantiated units? (Discuss in Talk:Systemd)

<p>By default, Arch Linux does not make use of systemd presets, and does not enable most services on installation.
</p><p>If you wish for systemd presets to be honored when packages are installed, you will need to create a a pacman hook in order to run <code>systemctl preset</code> or <code>systemctl preset-all</code> whenever a new systemd unit is installed. Something like
</p>
<pre>/etc/pacman.d/hooks/40-systemd-presets.hook</pre>
<pre>[Trigger]
Operation = Install
Type = Path
Target = usr/lib/systemd/system/*.service
Target = usr/lib/systemd/system/*.timer
Target = usr/lib/systemd/system/*.socket
Target = usr/lib/systemd/system/*.slice
Target = usr/lib/systemd/system/*.path
Target = usr/lib/systemd/system/*.target

[Action]
Description = Run systemctl preset
When = PostTransaction
Depends = systemd
NeedsTargets
# Alternatively, you could just run systemd preset-all.
# However, note that this will reset ALL services to the defaults,
# which is probably not what you want unless you have carefully configured
# your presets.
Exec = /etc/pacman.d/scripts/systemd-presets-hook
</pre>
<pre>/etc/pacman.d/scripts/sys'
|| 'temd-presets-hook</pre>
<pre>#!/bin/sh -e

while read -r f; do
 unit="${f##*/}"
 # alternatively, you could read all the units and pass them to systemctl preset in a single invocation
 systemctl preset "$unit"
done
</pre>
<p>Arch Linux ships with <code>/usr/lib/systemd/system-preset/99-default.preset</code> containing <code>disable *</code>. This causes <i>systemctl preset</i> to disable all units by default, such that when a new package is installed, the user must manually enable the unit.
</p><p>To enable units by default instead, simply create a symlink from <code>/etc/systemd/system-preset/99-default.preset</code> to <code>/dev/null</code> or replace with a file containing <code>enable *</code> in order to override the configuration file. This will cause <i>systemctl preset</i> to enable all units that get installed—regardless of unit type—unless specified in another file in one <i>systemctl preset''</i>s configuration directories. User units are not affected. It is also possible to configure higher priority files with more specific rules on what should be enabled. See systemd.preset(5) for more information.
</p>
<b>Note</b> Enabling all units by default may cause problems with packages that contain two or more mutually exclusive units. <i>systemctl preset</i> is designed to be used by distributions and spins or system administrators. In the case where two conflicting units would be enabled, you should explicitly specify which one is to be disabled in a preset configuration file as specified in the systemd.preset(5) man page.
<h3>Sandboxing application environments</h3>
<p>See systemd/Sandboxing.
</p>
<h3>Notifying about failed services</h3>
<p>In order to notify about service failures, an <code>OnFailure=</code> directive needs to be added to the according service '
|| 'file, for example by using a drop-in configuration file. Adding this directive to every service unit can be achieved with a top-level drop-in configuration file. For details about top-level drop-ins, see systemd.unit(5).
</p><p>Create a top-level drop-in for services:
</p>
<pre>/etc/systemd/system/service.d/toplevel-override.conf</pre>
<pre>[Unit]
OnFailure=failure-notification@%n.service</pre>
<p>This adds <code>OnFailure=failure-notification@%n.service</code> to every service file. If <i>some_service_unit</i> fails, <code>failure-notification@<i>some_service_unit</i>.service</code> will be started to handle the notification delivery (or whatever task it is configured to perform).
</p><p>Create the <code>failure-notification@.service</code> template unit:
</p>
<pre>/etc/systemd/system/failure-notification@.service</pre>
<pre>[Unit]
Description=Send a notification about a failed systemd unit

[Service]
Type=oneshot
ExecStart=/<i>path</i>/<i>to</i>/failure-notification.sh %i
# runs as a temporary user/group and enables several other security precautions
DynamicUser=true</pre>
<p>You can create the <code>failure-notification.sh</code> script and define what to do or how to notify. Examples include sending e-mail, showing desktop notifications, using gotify, XMPP, etc. The <code>%i</code> will be the name of the failed service unit and will be passed as an argument to the script.
</p><p>In order to prevent a recursion for starting instances of <code>failure-notification@.service</code> again and again if the start fails, create an empty drop-in configuration file with the same name as the top-level drop-in (the empty service-level drop-in configuration file takes precedence over the top-level drop-in and overrides the latter one):
</p>
<pre># mkdir /etc/systemd/system/fail'
|| 'ure-notification@.service.d
# touch /etc/systemd/system/failure-notification@.service.d/toplevel-override.conf
</pre>
<h3>Notifying with e-mail</h3>
<p>You can set up systemd to send an e-mail when a unit fails. Cron sends mail to <code>MAILTO</code> if the job outputs to stdout or stderr, but many jobs are setup to only output on error. First you need two files: an executable for sending the mail and a <i>.service</i> for starting the executable. For this example, the executable is just a shell script using <code>sendmail</code>, which is in packages that provide <code>smtp-forwarder</code>.
</p>
<pre>/usr/local/bin/systemd-email</pre>
<pre>#!/bin/sh

/usr/bin/sendmail -t &lt;&lt;ERRMAIL
To: $1
From: systemd &lt;root@$HOSTNAME&gt;
Subject: $2
Content-Transfer-Encoding: 8bit
Content-Type: text/plain; charset=UTF-8

$(systemctl status --full "$2")
ERRMAIL
</pre>
<p>Whatever executable you use, it should probably take at least two arguments as this shell script does: the address to send to and the unit file to get the status of. The <i>.service</i> we create will pass these arguments:
</p>
<pre>/etc/systemd/system/status_email_<i>user</i>@.service</pre>
<pre>[Unit]
Description=status email for %i to <i>user</i>

[Service]
Type=oneshot
ExecStart=/usr/local/bin/systemd-email <i>address</i> %i
User=nobody
Group=systemd-journal</pre>
<p>Where <code><i>user</i></code> is the user being emailed and <code><i>address</i></code> is that user''s email address. Although the recipient is hard-coded, the unit file to report on is passed as an instance parameter, so this one service can send email for many other units. At this point you can start <code>status_email_<i>user</i>@dbus.service</code> to verify that you can receive the emails.
</p><p>Then simply edit the service you want em'
|| 'ails for and add <code>OnFailure=status_email_<i>user</i>@%n.service</code> to the <code>[Unit]</code> section. <code>%n</code> passes the unit''s name to the template.
</p>
<b>Note</b> 
<ul><li>If you set up sSMTP security according to sSMTP#Security the user <code>nobody</code> will not have access to <code>/etc/ssmtp/ssmtp.conf</code>, and the <code>systemctl start status_email_<i>user</i>@dbus.service</code> command will fail. One solution is to use <code>root</code> as the User in the <code>status_email_<i>user</i>@.service</code> unit.</li>
<li>If you try to use <code>mail -s somelogs <i>address</i></code> in your email script, <code>mail</code> will fork and systemd will kill the mail process when it sees your script exit. Make the mail non-forking by doing <code>mail -Ssendwait -s somelogs <i>address</i></code>.</li></ul>

<b>Tip</b> Newer versions of systemd recommend using <code>DynamicUser=true</code> as a replacement for <code>User=nobody</code> which is now discouraged. See GitHub issue 428 for more details.
<h3>Automatically turn off an external HDD at shutdown</h3>
<p>See udisks#Automatically turn off an external HDD at shutdown.
</p><p><br>
</p>
<h3>Index of configuration directives</h3>
<p>An alphabetical index of configuration directives for various components of systemd can be found in systemd.directives(7).
</p>
<h3>Control user unit as root</h3>
<p>To control a systemd/User unit from root account:
</p>
<p class="article-note">（以下为节选，完整内容请见文末原文链接）</p><div class="reprint">本文正文摘自 <b>ArchWiki（wiki.archlinux.org）</b>（GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可））。原文：<a href="https://wiki.archlinux.org/title/Systemd" target="_blank" rel="noopener">https://wiki.archlinux.org/title/Systemd</a>。本站仅作转载与整理，版权归原作者所有；如需商用请核对原文当前许可声明。</div>','ArchWiki（wiki.archlinux.org）','https://wiki.archlinux.org/title/Systemd','GFDL 1.3（ArchWiki，允许全文转载，须署名并保留许可）',false,'98 分钟','转载自官方原文');
