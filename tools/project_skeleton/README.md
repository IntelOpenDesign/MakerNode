# Setting Up a Project on the Galileo
The recommended location for your project folders is in /home/root/projects.  (Use mkdir to create a projects folder if it does not already exist.)

````
cd /home/root/
mkdir projects
cd projects/
git clone https://github.com/adampasz/MakerNodeProjectSkeleton.git your_project_name
cd your_project_name
npm install
chmod u+x app.js
````

# Running Your Project
To start the server for your project:
````
cd /home/root/projects/your_project_name
killall node
node app.js
````

# Troubleshooting
**If you get a weird error about SSL or a CAfile, do this**
````
git config --global http.sslVerify false
````
**Avoid having to re-enter your github credentials all the time**
````
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=3600'
````
