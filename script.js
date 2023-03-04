'use strict';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const map = document.getElementById('map');


// workout
class Workout {
    id = (Date.now() + '').slice(-10);
    date = new Date();
    options = {year: 'numeric', month: 'long'};
    clicks = 0;
    constructor(cords, distance, duration) {
        this.cords = cords
        this.distance = distance
        this.duration = duration
    }
    click() {
        clicks += 1
    }
}

class Running extends Workout {
    type = 'running'

    constructor(cords, distance, duration, cadence) {
        super(cords, distance, duration)
        this.cadence = cadence;
        this.getPace();
    }
    getPace() {
        return this.pace = this.duration / this.distance;
    }
}
class Cycling extends Workout {
    type = 'cycling'

    constructor(cords, distance, duration, elevationGain) {
        super(cords, distance, duration, elevationGain)
        this.elevationGain = elevationGain;
        this.getSpeed();
    }
    getSpeed() {
        return this.speed = this.distance / (this.duration / 60);
    }
}
////////////////////////////////////////////////////////////////////////
class App {
    #workouts = []
    #map
    #eMarker
    #sizeZoom = 13

    constructor() {
            this._getAsyncData();
            inputType.addEventListener('change', this._toggleElevationField)
            containerWorkouts.addEventListener('click', this._getPositionOnMap.bind(this));
            form.addEventListener('submit', this._newWorkout.bind(this))
    }
    // ! correct async functions
    async _getAsyncData() {
        try {
            const position = await this._getPosition();
            const mapObject =  await this._loadMap.call(this, position);
            this.#map = mapObject;
            await this._loadStorage.call(this)
        } catch(err) {
            console.log(err)
        }
    }
    // get current position
    _getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject
        )})
    }
    // load current map
    _loadMap(position) {
        return new Promise((response, reject) => {
            const {latitude, longitude} = position.coords;
            this.#map = L.map(map)
                .setView([latitude, longitude],
                this.#sizeZoom);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
            this.#map.on('click',this._showForm.bind(this))
            response(this.#map)
        })
    }
    // curent position on map and zoom target
    _getPositionOnMap(e) {
        const getElementWorkout = e.target.closest('.workout');
        if (!getElementWorkout) return;
        const getWorkout = this.#workouts.find(workoutId => getElementWorkout.dataset.id === workoutId.id);
        this.#map
            .setView(getWorkout.cords,
                this.#sizeZoom,
                {
                animate: true,
                duration: 1.4
                }
            );

    }
    // open form on a page
    _showForm(eMap) {
        this.#eMarker = eMap;
        // remove class hidden for form
        form.classList.remove('hidden');
        inputDistance.focus()
    }
    _hiddenForm() {
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);

        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        inputType.value = 'running'
    }
    // discription marker
    _labelMarker() {
        return `${this.type === 'running' ? 'Running' : 'Cycling'} on ${new Date(this.date).toLocaleDateString(undefined, this.options)}`;
    }
    _toggleElevationField() {
            inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
            inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }
    // add a workout and discription a workout
    _newWorkout(e) {
        e.preventDefault();
        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#eMarker.latlng;
        let workout;
        // check if data is valid
        function checkValid(...values) {
            return values.every(val => Number.isFinite(val))
        }
        function isNotNegative(...values) {
            return values.every(val => Number.isFinite(val) > 0)
        }
        function workoutStorage(workout) {
            localStorage.setItem(workout.id, JSON.stringify(workout))
        }

        if (type === 'running') {
            const cadence = +inputCadence.value;
            if  (!checkValid(distance, duration, cadence) ||
                !isNotNegative(distance, duration, cadence) ) {
                    return alert('input value is not a number')
                }
            workout = new Running([lat, lng], distance, duration, cadence)
        }
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!checkValid(distance, duration, elevation) ||
            !isNotNegative(distance, duration)) {
                return alert('input value is not a number')
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // add a workout to the workouts array
        this.#workouts.push(workout);
        // render  workout marker
        this._renderWorkoutMarker(workout);
        // render workout to a form
        this._renderWorkout.call(workout, form);
        // hiden a form
        this._hiddenForm();

        workoutStorage(workout)
    }
    // add a marker on map with discription
    _renderWorkoutMarker(workout) {
        L.marker(workout.cords)
            .addTo(this.#map)
            .bindPopup(
        L.popup({
            maxWidth: 400,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })
            )
            .setPopupContent(this._labelMarker.call(workout))
            .openPopup()
    }
    //add a workout for element form
    _renderWorkout(node) {
        let html = `
            <li class="workout workout--${this.type}" data-id="${this.id}">
            <h2 class="workout__title">${App.prototype._labelMarker.call(this)}</h2>
            <div class="workout__details">
                <span class="workout__icon">${this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${this.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${this.duration}</span>
                <span class="workout__unit">min</span>
            </div>`;

            if (this.type === 'running') {
                html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${this.pace.toFixed(1)}</span>
                        <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">🦶🏼</span>
                        <span class="workout__value">${this.cadence}</span>
                        <span class="workout__unit">spm</span>
                    </div>
                    </li>`;
            }
            if (this.type === 'cycling') {
                html += `
                    <div class="workout__details">
                        <span class="workout__icon">⚡️</span>
                        <span class="workout__value">${this.speed.toFixed(1)}</span>
                        <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                        <span class="workout__icon">⛰</span>
                        <span class="workout__value">${this.elevationGain}</span>
                        <span class="workout__unit">m</span>
                    </div>
                    </li>`;
            }
            node.insertAdjacentHTML('afterend', html);

    }
    // LOCAL STORAGE FUNCTION
    _getDataLocalStorage(data) {
        return JSON.parse(localStorage.getItem(localStorage.key(data)))
    }
    // ! eddit function. not correct function!
    _loadStorage() {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < localStorage.length; i++) {
                if (!this.#workouts.length < localStorage.length) {
                    this.#workouts.push(this._getDataLocalStorage(i))
                }
                resolve(this._renderWorkout.call(JSON.parse(localStorage.getItem(localStorage.key(i))), form))
                this._renderWorkoutMarker(JSON.parse(localStorage.getItem(localStorage.key(i))));
            }

        })
    }
}
const app = new App();
