package com.championsclub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ChampionsClubApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChampionsClubApplication.class, args);
    }
}
