package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

<<<<<<< HEAD
@SpringBootApplication
@EnableCaching
=======
@SpringBootApplication(scanBasePackages = "com.example.demo")
>>>>>>> developer
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
