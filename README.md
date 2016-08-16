# Visual Studio Code Spring Boot Support

Spring Boot properties file completion and hover support.

## Features

- Property completion
- Property hover

## Extension Settings

Extension needs to scan the Java class path. You can configure Maven to output the current class path to a file named `classpath.txt`:

```
<plugin>
	<groupId>org.apache.maven.plugins</groupId>
	<artifactId>maven-dependency-plugin</artifactId>
	<version>2.9</version>
	<executions>
		<execution>
			<id>build-classpath</id>
			<phase>generate-sources</phase>
			<goals>
				<goal>build-classpath</goal>
			</goals>
		</execution>
	</executions>
	<configuration>
		<outputFile>classpath.txt</outputFile>
	</configuration>
</plugin>
```

## Installation

[Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ecmel.vscode-spring-boot)
