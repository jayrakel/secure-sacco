package com.jaytechwave.sacco.modules.core.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class GeoLocationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, String> locationCache = new ConcurrentHashMap<>();

    public String getLocation(String ip) {
        if (ip == null || ip.isBlank() || ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
            return "Local Network";
        }
        
        if (locationCache.containsKey(ip)) {
            return locationCache.get(ip);
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject("http://ip-api.com/json/" + ip, Map.class);
            if (response != null && "success".equals(response.get("status"))) {
                String city = (String) response.get("city");
                String countryCode = (String) response.get("countryCode");
                String location = city + ", " + countryCode;
                locationCache.put(ip, location);
                return location;
            }
        } catch (Exception e) {
            log.warn("Failed to lookup location for IP: {}", ip);
        }
        
        return "Unknown";
    }
}
