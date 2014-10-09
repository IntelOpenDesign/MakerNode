import sublime, sublime_plugin, subprocess, thread, os, functools

class ExampleCommand(sublime_plugin.WindowCommand):
    def run(self):
       self.window.run_command("exec", {"cmd": ["pwd"]})