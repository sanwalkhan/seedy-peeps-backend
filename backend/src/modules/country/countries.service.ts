import { Injectable, Logger } from '@nestjs/common';
import { Country } from './country.interface';
import countries from './countries.json';

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);
  private readonly countryList: Country[];

  constructor() {
    this.logger.log(`Countries JSON: ${JSON.stringify(countries)}`);

    if (Array.isArray(countries)) {
      this.countryList = countries.map((country: any) => ({
        name: country.name,
        code: country.code,
      }));
    } else {
      this.logger.error('Invalid format or empty countries JSON file.');
      this.countryList = [];
    }

    this.logger.log(`Parsed countries: ${JSON.stringify(this.countryList)}`);
  }

  getCountryNames(): string[] {
    return this.countryList.map((country) => country.name);
  }
}
