import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly secret = signal<string>('(loading)');

  constructor(private readonly http: HttpClient) {
    void this.loadSecret();
  }

  private async loadSecret(): Promise<void> {
    try {
      const value = await firstValueFrom(
        this.http.get('/secret', { responseType: 'text' })
      );
      this.secret.set(value);
    } catch (err) {
      this.secret.set(`ERROR: ${String(err)}`);
    }
  }
}
