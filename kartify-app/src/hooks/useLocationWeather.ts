import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { isDayTime } from '../utils/adaptiveTheme';

interface WeatherState {
  city: string;
  lat: number | null;
  lon: number | null;
  pincode: string | null;
  weatherLabel: string;
  weatherEmoji: string;
  isDay: boolean;
  loading: boolean;
}

const DEFAULT_STATE: WeatherState = {
  city: 'Your city',
  lat: null,
  lon: null,
  pincode: null,
  weatherLabel: 'Local deals',
  weatherEmoji: '🛍️',
  isDay: isDayTime(),
  loading: true,
};

let cachedState: WeatherState | null = null;
let inFlight: Promise<WeatherState> | null = null;

function mapWeather(code: number | null): { label: string; emoji: string } {
  if (code === null) {
    return { label: 'Local deals', emoji: '🛍️' };
  }
  if (code === 0) {
    return { label: 'Clear', emoji: '☀️' };
  }
  if ([1, 2].includes(code)) {
    return { label: 'Partly cloudy', emoji: '⛅' };
  }
  if (code === 3) {
    return { label: 'Cloudy', emoji: '☁️' };
  }
  if ([45, 48].includes(code)) {
    return { label: 'Foggy', emoji: '🌫️' };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { label: 'Drizzle', emoji: '🌦️' };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: 'Rain', emoji: '🌧️' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: 'Snow', emoji: '❄️' };
  }
  if ([95, 96, 99].includes(code)) {
    return { label: 'Storm', emoji: '⛈️' };
  }
  return { label: 'Local deals', emoji: '🛍️' };
}

export function useLocationWeather() {
  const [state, setState] = useState<WeatherState>(() => cachedState ?? DEFAULT_STATE);

  useEffect(() => {
    let alive = true;

    const resolveLocationWeather = async (): Promise<WeatherState> => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (requested.status !== 'granted') {
          return { ...DEFAULT_STATE, loading: false };
        }
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const current =
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null)) || lastKnown;

      if (!current) {
        return { ...DEFAULT_STATE, loading: false };
      }

      const lat = current.coords.latitude;
      const lon = current.coords.longitude;

      let city = 'Your city';
      let pincode: string | null = null;
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geocode.length > 0) {
        city =
          geocode[0].city ||
          geocode[0].district ||
          geocode[0].subregion ||
          geocode[0].region ||
          city;
        pincode = geocode[0].postalCode || null;
      }

      let weatherCode: number | null = null;
      let currentIsDay = isDayTime();
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day&forecast_days=1`
      ).catch(() => null);
      if (weatherRes && weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        weatherCode = Number.isFinite(weatherJson?.current?.weather_code)
          ? Number(weatherJson.current.weather_code)
          : null;
        currentIsDay = weatherJson?.current?.is_day === 1 ? true : isDayTime();
      }

      const weather = mapWeather(weatherCode);
      return {
        city,
        lat,
        lon,
        pincode,
        weatherLabel: weather.label,
        weatherEmoji: weather.emoji,
        isDay: currentIsDay,
        loading: false,
      };
    };

    const load = async () => {
      try {
        if (!inFlight) {
          inFlight = resolveLocationWeather().finally(() => {
            inFlight = null;
          });
        }
        const nextState = await inFlight;
        cachedState = nextState;
        if (alive) {
          setState(nextState);
        }
      } catch {
        if (alive) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    if (!cachedState) {
      load().catch(() => undefined);
    } else if (alive) {
      setState(cachedState);
    }

    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => state, [state]);
}
