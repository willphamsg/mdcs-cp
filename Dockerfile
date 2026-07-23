# Use the official Ubuntu 22.04 as a base image
## This is not needed it should only creates a dist folder and send the modules to the view repo.
FROM ubuntu:22.04

# Add npm global bin to PATH
ENV PATH=/usr/local/bin:/usr/local/lib/node_modules/@angular/cli/bin:$PATH

# Set the working directory inside the container.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory first for better caching of npm install
COPY package*.json ./

# Update and install necessary packages
RUN apt-get update \
    && apt-get install -y curl gnupg2 build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash -\
    && apt-get install -y nodejs \
    && npm install \
    && npm install -g @angular/cli@17.0.10 \
    && rm -rf /var/lib/apt/lists/ 

# Copy the rest of the application code to the working directory.
COPY . /usr/src/app

# Expose the port that the application will run on.
EXPOSE 8035

# Command to run the application.
ENTRYPOINT ["ng", "serve"]
CMD ["--host", "0.0.0.0"]