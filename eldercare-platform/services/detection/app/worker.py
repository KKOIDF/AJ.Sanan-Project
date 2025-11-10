import os, time, random, json, httpx
API_BASE = os.getenv("API_BASE", "http://localhost:8000")

# Placeholder loop: poll recent readings, fabricate rule detection

def run_loop():
    print("[detection] starting rule loop")
    while True:
        try:
            # In real system: subscribe to stream / Redis / Kafka
            # Here: pseudo-randomly simulate a 'fall' event
            if random.random() < 0.05:
                # Post an event (not implemented yet) -> would call /api/v1/events
                print("[detection] simulated fall event (stub)")
            time.sleep(5)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print("[detection] error", e)
            time.sleep(5)

if __name__ == "__main__":
    run_loop()
