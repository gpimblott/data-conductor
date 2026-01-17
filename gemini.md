This application is a data pipeline builder that allows users to create and manage data pipelines. It provides a visual interface for building and configuring data pipelines, and a set of pre-built nodes for common data processing tasks. The application is built using Next.js and TypeScript, and is designed to be easy to use and understand.

Some rules I want followed:
* all processing nodes should use streaming so that they can handle large datasets
* the pipeline definition information should be sored in the pipeline json file
* every node should save it's output in a file in the execution output directory
* Pipelines should run according to the defined schedule